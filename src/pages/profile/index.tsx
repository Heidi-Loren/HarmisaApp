import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { readUserProfileFromStorage } from '@/utils/profile/storage';
import { getOrCreateDeviceId } from '@/utils/device';
import type { UserProfile } from '@/utils/profile/types';

import WeightControls, { Weights } from '@/components/WeightControls';
import AllergenDrawer from '@/components/AllergenDrawer';
import TagPickerDrawer from '@/components/TagPickerDrawer';

import './index.scss';

// —— 设备隔离的偏好 key
const k = (id: string) => ({
  weights: `pref_weights:${id}`,
  allergens: `pref_allergens:${id}`,
  dislikes: `pref_dislikes:${id}`,
  craves: `pref_craves:${id}`,
});

/** 金字塔可视化（体质→环境→动因，自下而上） */
function PyramidWeights({ weights }: { weights: Weights }) {
  const rows = useMemo(
    () => ([
      { key: 'drivers', label: '动因', pct: Math.round(weights.drivers * 100), color: '#B9C6FF' },    // 顶
      { key: 'environment', label: '环境', pct: Math.round(weights.environment * 100), color: '#A8E6CF' }, // 中
      { key: 'constitution', label: '体质', pct: Math.round(weights.constitution * 100), color: '#FFD59E' }, // 底
    ]),
    [weights]
  );

  return (
    <View className='pyramid'>
      {rows.map((r) => (
        <View key={r.key} className='pyr-row'>
          {/* 中心缩放成“金字塔”的视觉（只改变内部条宽度） */}
          <View className='bar' style={{ width: `${Math.max(10, r.pct)}%`, background: r.color }} />
          <Text className='pyr-label'>{r.label}</Text>
          <Text className='pyr-pct'>{r.pct}%</Text>
        </View>
      ))}
      <Text className='pyr-note'>三层算法金字塔：体质为根基，环境居中，动因为顶</Text>
    </View>
  );
}

export default function MePage() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [weights, setWeights] = useState<Weights>({ constitution: .5, environment: .3, drivers: .2 });
  const [allergens, setAllergens] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [craves, setCraves] = useState<string[]>([]);

  const [openA, setOpenA] = useState(false);
  const [openD, setOpenD] = useState(false);
  const [openC, setOpenC] = useState(false);

  useDidShow(() => {
    // 画像
    setProfile(readUserProfileFromStorage());
    // 偏好
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    const key = k(id);

    const w = Taro.getStorageSync(key.weights);
    if (w && typeof w === 'object') setWeights(w as Weights);

    const a = Taro.getStorageSync(key.allergens); if (Array.isArray(a)) setAllergens(a);
    const d = Taro.getStorageSync(key.dislikes);  if (Array.isArray(d)) setDislikes(d);
    const c = Taro.getStorageSync(key.craves);    if (Array.isArray(c)) setCraves(c);
  });

  const overview = useMemo(() => {
    if (!profile) return '尚未完成画像';
    const { constitution, climate, motivation } = profile;
    return `体质 ${constitution.main}${constitution.secondary?.length ? ' / ' + constitution.secondary.join(' / ') : ''} · 季节 ${climate.season} · 动因 ${motivation.main}`;
  }, [profile]);

  // 写回存储
  const saveWeights = (w: Weights) => {
    setWeights(w);
    if (deviceId) Taro.setStorageSync(k(deviceId).weights, w);
  };
  const applyAllergens = (v: string[]) => { setAllergens(v); deviceId && Taro.setStorageSync(k(deviceId).allergens, v); setOpenA(false); };
  const applyDislikes  = (v: string[]) => { setDislikes(v);  deviceId && Taro.setStorageSync(k(deviceId).dislikes,  v); setOpenD(false); };
  const applyCraves    = (v: string[]) => { setCraves(v);    deviceId && Taro.setStorageSync(k(deviceId).craves,    v); setOpenC(false); };

  async function clearAll() {
    const res = await Taro.showModal({ title: '确认清空', content: '将清空本地画像、权重与偏好', confirmText: '清空' });
    if (!res.confirm) return;
    const key = k(deviceId || getOrCreateDeviceId());
    [
      'constitution_result', 'env_context', 'motivation_result',
      key.weights, key.allergens, key.dislikes, key.craves
    ].forEach(Taro.removeStorageSync);
    setProfile(null); setAllergens([]); setDislikes([]); setCraves([]);
    setWeights({ constitution: .5, environment: .3, drivers: .2 });
    Taro.showToast({ title: '已清空', icon: 'success' });
  }

  function exportDebug() {
    const payload = { deviceId, profile, weights, allergens, dislikes, craves, time: new Date().toISOString() };
    Taro.setClipboardData({ data: JSON.stringify(payload, null, 2) });
    Taro.showToast({ title: '已复制调试信息', icon: 'none' });
  }

  // TODO: 按你的实际路由改下面三条
  const goConstitution = () => Taro.navigateTo({ url: '/pages/profile/index' });
  const goEnvironment  = () => Taro.navigateTo({ url: '/pages/B2C/environment/index' });
  const goMotivation   = () => Taro.navigateTo({ url: '/pages/B2C/motivation/index' });

  return (
    <View className='me-page'>
      <View className='head'>
        <Text className='title'>我的画像</Text>
        <Text className='subtitle'>{overview}</Text>
      </View>

      {/* 金字塔概览 */}
      <View className='section'>
        <Text className='sec-title'>三层算法权重（金字塔）</Text>
        <PyramidWeights weights={weights} />
      </View>

      {/* 权重设置（可选：这里也能调） */}
      <View className='section'>
        <Text className='sec-title'>权重设置</Text>
        <WeightControls value={weights} onChange={saveWeights} />
      </View>

      {/* 偏好与筛选 */}
      <View className='section'>
        <Text className='sec-title'>偏好与筛选</Text>

        <View className='row'><Text className='label'>过敏（硬排除）</Text><Button size='mini' onClick={() => setOpenA(true)}>编辑</Button></View>
        <View className='chips'>{allergens.length ? allergens.map(t => <Text key={t} className='chip'>{t}</Text>) : <Text className='muted'>无</Text>}</View>

        <View className='row'><Text className='label'>不爱吃（降权）</Text><Button size='mini' onClick={() => setOpenD(true)}>编辑</Button></View>
        <View className='chips'>{dislikes.length ? dislikes.map(t => <Text key={t} className='chip'>{t}</Text>) : <Text className='muted'>无</Text>}</View>

        <View className='row'><Text className='label'>今天想吃（加权）</Text><Button size='mini' onClick={() => setOpenC(true)}>编辑</Button></View>
        <View className='chips'>{craves.length ? craves.map(t => <Text key={t} className='chip'>{t}</Text>) : <Text className='muted'>无</Text>}</View>
      </View>

      {/* 数据与管理 */}
      <View className='section'>
        <Text className='sec-title'>数据与管理</Text>
        <View className='kv'><Text className='k'>设备ID</Text><Text className='v mono'>{deviceId || '-'}</Text></View>
        <View className='btns'>
          <Button size='mini' onClick={goConstitution}>重测体质</Button>
          <Button size='mini' onClick={goEnvironment}>更新环境</Button>
          <Button size='mini' onClick={goMotivation}>重测动因</Button>
        </View>
        <View className='btns'>
          <Button className='ghost' size='mini' onClick={exportDebug}>导出调试信息</Button>
          <Button type='warn' size='mini' onClick={clearAll}>清空本地数据</Button>
        </View>
      </View>

      {/* 抽屉 */}
      <AllergenDrawer visible={openA} value={allergens} onConfirm={applyAllergens} onClose={() => setOpenA(false)} />
      <TagPickerDrawer visible={openD} title='不爱吃（挑食）' suggested={['香菜','内脏','洋葱','大蒜','辣','咖喱','羊肉','海鲜','甜','酸']} value={dislikes} onConfirm={applyDislikes} onClose={() => setOpenD(false)} />
      <TagPickerDrawer visible={openC} title='今天想吃' suggested={['辣','清淡','面','饭','汤','烧烤','咖喱','牛肉','鸡肉','海鲜','甜']} value={craves} onConfirm={applyCraves} onClose={() => setOpenC(false)} />
    </View>
  );
}
