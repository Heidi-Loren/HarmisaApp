import { useEffect, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";

const SUGGESTED = [
  "花生","坚果","芝麻","牛奶","乳制品","鸡蛋","大豆",
  "海鲜","甲壳类","贝类","小麦","麸质","芹菜"
];

export default function AllergenDrawer({
  visible,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: string[];
  onConfirm: (allergens: string[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<string[]>(value || []);
  const [input, setInput] = useState("");

  useEffect(() => { setLocal(value || []); }, [visible]);

  function toggle(tag: string) {
    setLocal(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function addFromInput() {
    const tokens = String(input || "")
      .split(/[,，;；、\s]+/).map(s => s.trim()).filter(Boolean);
    if (!tokens.length) return;
    setLocal(prev => Array.from(new Set([...prev, ...tokens])));
    setInput("");
  }

  return (
    <View className={`drawer ${visible ? "show" : ""}`}>
      <View className="drawer-mask" onClick={onClose} />
      <View className="drawer-panel">
        <Text className="drawer-title">过敏筛选</Text>

        <View className="section">
          <Text className="label">常见选项</Text>
          <View className="chips">
            {SUGGESTED.map(tag => (
              <Text
                key={tag}
                className={`chip ${local.includes(tag) ? "active" : ""}`}
                onClick={() => toggle(tag)}
              >
                {tag}
              </Text>
            ))}
          </View>
        </View>

        <View className="section">
          <Text className="label">自定义</Text>
          <View className="inline">
            <Input
              className="ipt"
              placeholder="输入后按添加，如：芝麻、腰果"
              value={input}
              onInput={e => setInput(String((e.detail as any).value || ""))}
              confirmType="done"
              onConfirm={addFromInput}
            />
            <Button className="btn" size="mini" onClick={addFromInput}>添加</Button>
          </View>
          {!!local.length && (
            <Text className="hint">已选：{local.join("、")}</Text>
          )}
        </View>

        <View className="footer">
          <Button className="btn ghost" onClick={() => setLocal([])}>清空</Button>
          <Button className="btn primary" onClick={() => onConfirm(local)}>确定</Button>
        </View>
        <Text className="disclaimer">
          仅供参考：基于菜品标签的前端筛选，可能不完整。如有严重过敏请务必线下确认。
        </Text>
      </View>
    </View>
  );
}
