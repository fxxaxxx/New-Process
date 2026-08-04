// 退出登录:清本地令牌后整页回登录页(整页跳转顺带清空内存中的权限缓存)
export function logout() {
  localStorage.removeItem("erp_token");
  localStorage.removeItem("erp_user");
  window.location.href = "/login";
}
