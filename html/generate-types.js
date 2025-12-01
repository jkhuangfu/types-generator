const httpMethods = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "connect",
  "trace",
];

/**
 * 创建解析上下文（独立作用域）
 */
const createContext = (swagger) => {
  const typeCache = new Set();

  /** 解析 $ref 引用路径 */
  const resolveRef = (ref) => {
    if (!ref) return null;
    const parts = ref.replace(/^#\//, "").split("/");
    return parts.reduce((obj, key) => obj?.[key], swagger);
  };

  /** 首字母大写 */
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  /** 多段路径转换为驼峰名称 */
  const camelCaseName = (segments) =>
    segments.map(capitalizeFirstLetter).join("");

  /** 替换 Swagger 风格的泛型符号为 TypeScript 形式 */
  const normalizeTypeName = (raw) => raw.replace(/«/g, "<").replace(/»/g, ">");

  /** 根据 API 路径生成接口名 */
  const getInterfaceName = (apiPath, suffix) => {
    const segments = apiPath.replace(/[{}]/g, "").split("/").filter(Boolean);
    const raw = camelCaseName(segments) + suffix;
    return normalizeTypeName(raw);
  };

  /** 根据 schema 类型生成对应 TypeScript 类型定义 */
  const resolveType = (schema) => {
    if (!schema) return "any";
    if (schema.enum)
      return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
    if (schema.$ref) return normalizeTypeName(schema.$ref.split("/").pop());
    if (schema.type === "array") return `${resolveType(schema.items)}[]`;
    if (schema.type === "integer" || schema.type === "number") return "number";
    if (schema.type === "boolean") return "boolean";
    if (schema.type === "string") return "string";
    if (schema.type === "object") return "{ [key: string]: any }";
    return "any";
  };

  /** 递归生成 TypeScript 接口定义 */
  const schemaToTs = (schema, name, extraInterfaces) => {
    if (!schema || typeCache.has(name)) return "";
    typeCache.add(name);

    if (schema.$ref) {
      return schemaToTs(resolveRef(schema.$ref), name, extraInterfaces);
    }

    if (schema.type === "object") {
      const props = schema.properties || {};
      const requiredFields = schema.required || [];

      const lines = Object.entries(props).map(([key, val]) => {
        const required = requiredFields.includes(key) ? "" : "?";
        let type = resolveType(val);

        // 深层嵌套处理
        if (val.type === "array" && val.items?.$ref) {
          const nested = resolveRef(val.items.$ref);
          const nestedName = normalizeTypeName(val.items.$ref.split("/").pop());
          extraInterfaces.push(schemaToTs(nested, nestedName, extraInterfaces));
          type = `${nestedName}[]`;
        } else if (val.$ref) {
          const nested = resolveRef(val.$ref);
          const nestedName = normalizeTypeName(val.$ref.split("/").pop());
          extraInterfaces.push(schemaToTs(nested, nestedName, extraInterfaces));
          type = nestedName;
        }

        const comment = val.description ? `/** ${val.description} */\n  ` : "";
        return `${comment}${key}${required}: ${type};`;
      });

      return `interface ${name} {\n  ${lines.join("\n  ")}\n}`;
    }

    return `type ${name} = ${resolveType(schema)};`;
  };

  /** 判断是否 OpenAPI2 */
  const isOpenAPI2 = () =>
    swagger?.swagger?.startsWith("2.") || swagger?.openapi?.startsWith("2.");

  /** 兼容不同层次的响应结构 */
  const getFinalResponseSchema = (schema) => {
    if (!schema) return null;
    return schema.$ref ? resolveRef(schema.$ref) : schema;
  };

  /** 获取路径中首个包含 responses 的方法 */
  const findFirstMethodWithSchema = (pathItem) => {
    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (operation?.responses) {
        return { method, operation };
      }
    }
    throw new Error(`无响应 schema 的方法`);
  };

  /** 提取响应中第一个可用 schema */
  const findFirstResponse = (responses) => {
    if (responses["200"]) return responses["200"];
    if (responses["default"]) return responses["default"];
    return responses[Object.keys(responses)[0]];
  };

  /** 提取请求 schema */
  const extractRequestSchema = (operation) => {
    if (operation.requestBody?.content) {
      const contentMap = operation.requestBody.content;
      for (const type of Object.keys(contentMap)) {
        const schema = contentMap[type]?.schema;
        return schema?.$ref ? resolveRef(schema.$ref) : schema;
      }
    }
    if (operation.parameters?.length) {
      const props = {};
      operation.parameters.forEach((param) => {
        if (param.schema || param.type) {
          props[param.name] = {
            ...param.schema,
            type: param.schema?.type || param.type,
            description: param.description || "",
            required: param.required,
          };
        }
      });
      return Object.keys(props).length
        ? { type: "object", properties: props }
        : null;
    }
    return null;
  };

  /** 提取响应 schema */
  const extractResponseSchema = (operation) => {
    const responses = operation.responses;
    const response = findFirstResponse(responses);
    if (!response) throw new Error("无响应");

    if (isOpenAPI2()) {
      return response.schema?.$ref
        ? getFinalResponseSchema(response.schema)
        : response.schema;
    }

    const content = response.content;
    if (!content) return null;
    for (const type of Object.keys(content)) {
      const schema = content[type]?.schema;
      return schema?.$ref ? getFinalResponseSchema(schema) : schema;
    }

    return null;
  };

  /** 生成单个路径的类型定义 */
  const generateTypesForPath = (apiPath, tagName = "") => {
    const pathItem = swagger.paths?.[apiPath];
    if (!pathItem) throw new Error(`Path '${apiPath}' not found.`);

    const { method, operation } = findFirstMethodWithSchema(pathItem);
    const reqSchema = extractRequestSchema(operation);
    const resSchema = extractResponseSchema(operation);

    const extra = [];
    const reqName = getInterfaceName(apiPath, "Request");
    const resName = getInterfaceName(apiPath, "Response");
    const reqTs = reqSchema ? schemaToTs(reqSchema, reqName, extra) : "";
    const resTs = resSchema ? schemaToTs(resSchema, resName, extra) : "";

    const comment =
      operation.summary || tagName || operation.tags?.join(" / ") || "";

    return `// ${comment}\n/// declare for ${apiPath} [${method.toUpperCase()}]\n\n${[
      ...extra,
      reqTs,
      resTs,
    ]
      .filter(Boolean)
      .join("\n\n")}\n`;
  };

  return { generateTypesForPath };
};

/**
 * 主函数入口（无状态）
 */
const generateTypes = async (swaggerSource, apiPathsParams) => {
  console.log(
    "🚀 ~ generateTypes ~ swaggerSource, apiPathsParams:",
    swaggerSource,
    apiPathsParams
  );
  const apiPaths = apiPathsParams
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  try {
    const swagger = await fetch(swaggerSource).then((res) => res.json());
    console.log("🚀 ~ generateTypes ~ swagger:", swagger);
    const ctx = createContext(swagger);
    const allOutput = [];

    for (const apiPath of apiPaths) {
      try {
        const pathItem = swagger.paths?.[apiPath] || {};
        const tags =
          httpMethods
            .map((method) => pathItem[method]?.tags)
            .find((t) => Array.isArray(t) && t.length > 0) || [];
        const tagName = tags[0] || "common";
        const content = ctx.generateTypesForPath(apiPath, tagName);
        allOutput.push(content);
      } catch (e) {
        console.error(`❌ ${apiPath} 失败: ${e.message}`);
      }
    }
    return allOutput.join("\n");
  } catch (e) {
    console.error(`❌ 加载失败: ${e.message}`);
    throw e;
  }
};
