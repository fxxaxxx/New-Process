import { useParams } from "react-router-dom";
import { Card, Result } from "antd";

export default function PlaceholderPage() {
  const { name = "" } = useParams();
  const label = decodeURIComponent(name);
  return (
    <Card>
      <Result
        status="info"
        title={`【${label}】功能开发中`}
        subTitle="该模块尚未在本系统实现"
      />
    </Card>
  );
}
