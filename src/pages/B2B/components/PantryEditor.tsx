import { useEffect, useMemo, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
// import Taro from "@tarojs/taro";

type Props = {
  today: string[];
  history: string[];
  onApply: (nextToday: string[]) => void;   // 点击“应用”
  onUpdate?: (nextToday: string[], nextHistory: string[]) => void; // 可选：实时回传
};

function splitWords(s: string): string[] {
  return String(s || "")
    .split(/[\n\s,，、;；]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

export default function PantryEditor({ today, history, onApply, onUpdate }: Props) {
  const [buf, setBuf] = useState("");
  const [sel, setSel] = useState<string[]>(today || []);
  const histSet = useMemo(() => new Set((history || []).map(x => x.trim()).filter(Boolean)), [history]);

  // 外部 today 变化时，同步
  useEffect(() => setSel(today || []), [today]);

  function addFromBuf() {
    const words = splitWords(buf);
    if (!words.length) return;
    const next = Array.from(new Set([...sel, ...words]));
    setSel(next);
    setBuf("");
    onUpdate?.(next, Array.from(new Set([...history, ...words])));
  }
  function toggleWord(w: string) {
    const has = sel.includes(w);
    const next = has ? sel.filter(x => x !== w) : [...sel, w];
    setSel(next);
    onUpdate?.(next, history);
  }
  function clearToday() {
    setSel([]);
    onUpdate?.([], history);
  }
  function selectAllHistory() {
    const next = Array.from(new Set([...sel, ...history]));
    setSel(next);
    onUpdate?.(next, history);
  }

  return (
    <View className="pantry">
      <View className="row">
        <Input
          className="ipt"
          value={buf}
          placeholder="输入你厨房的食材，回车或空格添加（可粘贴多项）"
          confirmType="done"
          onInput={e => setBuf((e.detail as any).value)}
          onConfirm={addFromBuf}
        />
        <Button size="mini" className="btn" onClick={addFromBuf}>添加</Button>
        <Button size="mini" className="btn" onClick={clearToday}>清空今日</Button>
        <Button size="mini" className="btn" onClick={selectAllHistory}>全选历史</Button>
        <Button size="mini" className="primary" onClick={() => onApply(sel)}>应用</Button>
      </View>

      <View className="section">
        <Text className="sec-title">今日可用</Text>
        <View className="chips">
          {sel.length
            ? sel.map(w => (
                <Text key={w} className="chip on" onClick={() => toggleWord(w)}>
                  {w} <Text className="x">×</Text>
                </Text>
              ))
            : <Text className="muted">（暂无，先在上方输入或从历史勾选）</Text>}
        </View>
      </View>

      <View className="section">
        <Text className="sec-title">历史记录</Text>
        <View className="chips">
          {histSet.size
            ? Array.from(histSet).map(w => (
                <Text
                  key={w}
                  className={`chip ${sel.includes(w) ? "on" : ""}`}
                  onClick={() => toggleWord(w)}
                >
                  {w}
                </Text>
              ))
            : <Text className="muted">（首次使用还没有历史）</Text>}
        </View>
      </View>
    </View>
  );
}
