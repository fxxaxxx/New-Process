import { useEffect, useRef, useState, useCallback } from "react";
import { Button, Input, Modal, Space, Tooltip, message } from "antd";
import { BarcodeOutlined, CameraOutlined } from "@ant-design/icons";

// 扫码录入条：扫码枪扫入条码后回车触发 onScan，扫完自动清空并重新聚焦，支持连续扫码。
// 扫码枪本质是"快速键盘输入 + 回车"，所以一个常驻聚焦的输入框即可接收。
// 摄像头扫码用浏览器原生 BarcodeDetector（Chrome/Edge 支持），不支持则隐藏按钮。

interface BarcodeDetectorResult { rawValue: string }
interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

const getDetectorCtor = (): BarcodeDetectorCtor | null =>
  (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;

export default function ScanEntry({ onScan, disabled, placeholder }: {
  onScan: (code: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);            // 防止 onScan 未完成时重复触发
  const cameraSupported = getDetectorCtor() !== null;

  const focus = useCallback(() => {
    // 延迟聚焦，避免与弹窗/表格重渲染抢焦点
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { if (!disabled) focus(); }, [disabled, focus]);

  const submit = async (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current) return;
    busyRef.current = true;
    try { await onScan(code); }
    finally {
      busyRef.current = false;
      setValue("");
      focus();   // 扫完重新聚焦，便于连续扫码；用户点其他输入框时不强制抢焦点
    }
  };

  return (
    <Space.Compact style={{ width: "100%", maxWidth: 520 }}>
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        prefix={<BarcodeOutlined style={{ color: "#1677ff" }} />}
        placeholder={placeholder ?? "扫物料条码后回车（扫码枪直接扫）"}
        value={value}
        disabled={disabled}
        allowClear
        onChange={e => setValue(e.target.value)}
        onPressEnter={e => { void submit((e.target as HTMLInputElement).value); }}
      />
      {cameraSupported && (
        <Tooltip title="用摄像头扫码">
          <Button icon={<CameraOutlined />} disabled={disabled} onClick={() => setCameraOpen(true)} />
        </Tooltip>
      )}
      <CameraScanModal
        open={cameraOpen}
        onClose={() => { setCameraOpen(false); focus(); }}
        onScan={code => { setCameraOpen(false); void submit(code); }}
      />
    </Space.Compact>
  );
}

// 摄像头扫码弹窗：getUserMedia 拉流 + BarcodeDetector 逐帧识别，识别到即回调并关闭。
function CameraScanModal({ open, onClose, onScan }: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) { stop(); return; }
    let cancelled = false;
    setError("");

    const start = async () => {
      const Ctor = getDetectorCtor();
      if (!Ctor) { setError("当前浏览器不支持摄像头扫码，请用扫码枪"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },   // 优先后置摄像头
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new Ctor({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a"] });
        timerRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              stop();
              onScan(codes[0].rawValue);
            }
          } catch { /* 单帧识别失败忽略，继续下一帧 */ }
        }, 300);
      } catch {
        setError("无法打开摄像头（需授权，且仅在 HTTPS 或 localhost 下可用）");
      }
    };
    void start();
    return () => { cancelled = true; stop(); };
  }, [open, onScan, stop]);

  return (
    <Modal title="摄像头扫码" open={open} onCancel={onClose} footer={null} width={420} destroyOnHidden>
      {error
        ? <div style={{ color: "#cf1322", padding: "24px 0", textAlign: "center" }}>{error}</div>
        : <video ref={videoRef} style={{ width: "100%", borderRadius: 8, background: "#000" }} muted playsInline />}
      <div style={{ marginTop: 8, color: "#888", textAlign: "center" }}>对准物料条码，识别成功自动填入</div>
    </Modal>
  );
}

// 供父组件在扫码失败时统一提示
export const scanNotFound = (code: string) => message.warning(`未找到条码对应的物料：${code}`);
