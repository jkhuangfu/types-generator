const openapiUrlInput = document.getElementById("openapiUrl");
const apiPathInput = document.getElementById("apiPath");
const fetchBtn = document.getElementById("fetchBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const codeContainer = document.getElementById("codeContainer");
const codeBlock = document.getElementById("code");
const errorDiv = document.getElementById("error");

openapiUrlInput.value = localStorage.getItem("openapiUrl") || "";

fetchBtn.addEventListener("click", async () => {
  const openapiUrl = openapiUrlInput.value.trim();
  const apiPath = apiPathInput.value.trim();
  errorDiv.textContent = "";
  codeContainer.style.display = "none";
  codeBlock.textContent = "";

  if (!openapiUrl) {
    errorDiv.textContent = "请填写 openapiUrl";
    return;
  }

  if (!apiPath) {
    errorDiv.textContent = "请填写 apiPath";
    return;
  }

  localStorage.setItem("openapiUrl", openapiUrl);

  fetchBtn.disabled = true;
  fetchBtn.textContent = "生成中...";
  try {
    const types = await generateTypes(openapiUrl, apiPath);
    codeBlock.textContent = types || "未返回任何类型定义";
    Prism.highlightElement(codeBlock);
    codeContainer.style.display = "block";
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  } catch (e) {
    console.error("Error:", e);
    codeBlock.textContent = "生成出错: " + e.message;
    codeContainer.style.display = "block";
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = "生成 TypeScript";
  }
});

copyBtn.addEventListener("click", async () => {
  const text = codeBlock.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    alert("已复制到剪贴板");
  } catch (e) {
    alert("复制失败，请手动复制");
  }
});

downloadBtn.addEventListener("click", () => {
  const text = codeBlock.textContent;
  if (!text) return;
  const blob = new Blob([text], {
    type: "text/typescript;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    (apiPathInput.value || "openapi").replace(/[^a-z0-9.-_]/gi, "_") + ".d.ts";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
