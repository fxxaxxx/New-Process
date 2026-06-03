namespace ErpApi.Features.Auth;
public sealed record LoginRequest(string 用户, string 密码);
public sealed record LoginResult(bool 成功, string? 令牌, string? 消息);
