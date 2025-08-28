import { useEffect, useRef, useState } from "react";
import { View, Text, Slider, Button, Input, Switch } from "@tarojs/components";

export type Weights = { constitution: number; environment: number; drivers: number };
type Key = keyof Weights;

const KEYS: Key[] = ["constitution", "environment", "drivers"];
const LABELS: Record<Key, string> = { constitution: "体质", environment: "环境", drivers: "动因" };

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function round2(x: number) { return Math.round(x * 100) / 100; }

function normalize(w: Weights): Weights {
  const sum = (w.constitution + w.environment + w.drivers) || 1;
  return {
    constitution: round2(w.constitution / sum),
    environment: round2(w.environment / sum),
    drivers: round2(w.drivers / sum),
  };
}

/** 在锁定规则下，把某项设置为 target(0..1)，其余“未锁定”项按比例缩放，保证总和=1 */
function adjustWithLocks(w: Weights, key: Key, target: number, locks: Record<Key, boolean>): Weights {
  if (locks[key]) return w; // 被锁定，忽略调整

  const lockedKeys = KEYS.filter(k => locks[k]);
  const unlockedKeys = KEYS.filter(k => !locks[k]);

  // 已锁定权重之和与剩余可分配“预算”
  const lockedSum = lockedKeys.reduce((s, k) => s + w[k], 0);
  const budget = clamp01(1 - lockedSum);

  // 目标值不能超过预算
  const t = Math.min(clamp01(target), budget);

  const next: Weights = { ...w };
  next[key] = t;

  // 其他未锁定项按比例缩放到剩余 (budget - t)
  const others = unlockedKeys.filter(k => k !== key);
  const othersSum = others.reduce((s, k) => s + w[k], 0);

  if (others.length === 0) {
    // 只有这一个是未锁定，直接吃满预算
    next[key] = budget;
  } else if (othersSum <= 1e-6) {
    const split = (budget - t) / others.length;
    others.forEach(k => (next[k] = split));
  } else {
    const scale = (budget - t) / othersSum;
    others.forEach(k => (next[k] = round2(w[k] * scale)));
  }

  // 锁定项保持不变
  lockedKeys.forEach(k => (next[k] = w[k]));

  // 纠偏：确保总和严格为 1（把误差丢给当前项或第一个未锁定项）
  const sum = KEYS.reduce((s, k) => s + next[k], 0);
  const diff = 1 - sum;
  const receiver = !locks[key] ? key : (unlockedKeys[0] ?? key);
  next[receiver] = clamp01(round2(next[receiver] + diff));

  return next;
}

export default function WeightControls({
  value,
  onChange,
}: {
  value: Weights;
  onChange: (w: Weights) => void;
}) {
  const [w, setW] = useState<Weights>(normalize(value));
  const [locks, setLocks] = useState<Record<Key, boolean>>({
    constitution: false, environment: false, drivers: false,
  });
  const timer = useRef<any>(null);

  useEffect(() => setW(normalize(value)), [value]);

  function emit(next: Weights, debounce = true) {
    setW(next);
    if (!debounce) { onChange(normalize(next)); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(normalize(next)), 400);
  }

  function onSlide(key: Key, pct: number) {
    emit(adjustWithLocks(w, key, pct / 100, locks));
  }
  function step(key: Key, deltaPct: number) {
    if (locks[key]) return;
    const cur = Math.round(w[key] * 100);
    emit(adjustWithLocks(w, key, clamp01((cur + deltaPct) / 100), locks));
  }
  function setExact(key: Key, text: string) {
    if (locks[key]) return;
    const num = Number(String(text).replace(/[^\d.]/g, ""));
    if (Number.isNaN(num)) return;
    const pct = Math.max(0, Math.min(100, Math.round(num)));
    emit(adjustWithLocks(w, key, pct / 100, locks), false); // 直接生效
  }
  function toggleLock(key: Key, v: boolean) {
    const nextLocks = { ...locks, [key]: v };
    setLocks(nextLocks);
    // 锁定后如果总和不为1，做一次规范化（不改变已锁权重比例）
    emit(adjustWithLocks(w, key, w[key], nextLocks), false);
  }
  function applyPreset(p: Weights) {
    const next = normalize(p);
    setW(next);
    onChange(next); // 预设直接生效
  }

  return (
    <View className="weights">
      {/* 预设 */}
      <View className="presets">
        <Text className="preset" onClick={() => applyPreset({ constitution: .5, environment: .3, drivers: .2 })}>均衡 50/30/20</Text>
        <Text className="preset" onClick={() => applyPreset({ constitution: .6, environment: .25, drivers: .15 })}>体质优先</Text>
        <Text className="preset" onClick={() => applyPreset({ constitution: .35, environment: .5, drivers: .15 })}>环境优先</Text>
        <Text className="preset" onClick={() => applyPreset({ constitution: .4, environment: .2, drivers: .4 })}>动因优先</Text>
      </View>

      {KEYS.map((key) => (
        <View key={key} className="row">
          <View className="row-head">
            <Text className="label">{LABELS[key]}</Text>
            <View className="inline">
              <Text className={`lock ${locks[key] ? 'on' : ''}`}>锁定</Text>
              <Switch checked={locks[key]} onChange={(e: any) => toggleLock(key, !!e.detail.value)} />
              <Button className="mini" size="mini" onClick={() => step(key, -1)} disabled={locks[key]}>-1%</Button>
              <Input
                className="pct"
                type="number"
                disabled={locks[key]}
                value={String(Math.round(w[key] * 100))}
                onConfirm={(e: any) => setExact(key, e?.detail?.value)}
                onBlur={(e: any) => setExact(key, e?.detail?.value)}
              />
              <Text>%</Text>
              <Button className="mini" size="mini" onClick={() => step(key, +1)} disabled={locks[key]}>+1%</Button>
            </View>
          </View>

          <Slider
            min={0}
            max={100}
            step={1}
            value={Math.round(w[key] * 100)}
            disabled={locks[key]}
            onChanging={(e: any) => onSlide(key, e.detail.value as number)}
          />
        </View>
      ))}

      <View className="meta">
        <Text>合计：{Math.round((w.constitution + w.environment + w.drivers) * 100)}%</Text>
        <Text className="reset" onClick={() => applyPreset({ constitution: .5, environment: .3, drivers: .2 })}>恢复默认</Text>
      </View>
    </View>
  );
}
