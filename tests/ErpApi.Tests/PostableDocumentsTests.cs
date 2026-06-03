using ErpApi.Engines.Posting;
using Xunit;

public class PostableDocumentsTests
{
    [Fact]
    public void Known_table_is_allowed()
        => Assert.True(PostableDocuments.IsAllowed("成品入仓单"));

    [Fact]
    public void Unknown_or_injection_is_rejected()
    {
        Assert.False(PostableDocuments.IsAllowed("成品入仓单; DROP TABLE x--"));
        Assert.False(PostableDocuments.IsAllowed("不存在的表"));
    }
}
