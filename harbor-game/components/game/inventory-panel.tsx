'use client';
import { useRef, useState } from 'react';
import {
  Backpack,
  LockKeyhole,
  Package,
  Radio,
  Microchip,
  Watch,
  Cable,
  Settings2,
  HeartPulse,
  FileText,
  Coffee,
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
} from 'lucide-react';
import type { Raid, Item } from '@/lib/simulation';
type Area = 'bag' | 'secure' | 'loot';
type Selection = { area: Area; item: Item };
const icons: Record<string, typeof Package> = {
  wire: Cable,
  parts: Settings2,
  tea: Coffee,
  radio: Radio,
  chip: Microchip,
  med: HeartPulse,
  watch: Watch,
  manifest: FileText,
};
const cash = (v: number) => '¥ ' + v.toLocaleString('en-US');
export function InventoryPanel({
  raid: r,
  refresh,
}: {
  raid: Raid;
  refresh: () => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null),
    [over, setOver] = useState<string | null>(null);
  const drag = useRef<Selection | null>(null);
  const chest = r.loot.find((c) => c.id === r.openLoot);
  const items = (area: Area) =>
    area === 'bag'
      ? r.bag
      : area === 'secure'
        ? r.secure
        : (chest?.items ?? []);
  const selected =
    selection && items(selection.area).includes(selection.item)
      ? selection
      : null;
  function move(from: Selection, to: 'bag' | 'secure', target?: number) {
    const index = items(from.area).indexOf(from.item);
    if (index < 0) return;
    const ok =
      from.area === 'loot'
        ? r.take(index, to)
        : r.transfer(index, from.area, to, target);
    if (ok) setSelection({ area: to, item: from.item });
    refresh();
  }
  function grid(area: Area, count: number) {
    const list = items(area);
    return (
      <div
        className={'inventory-grid ' + area}
        aria-label={
          area === 'bag'
            ? '背包：12 格'
            : area === 'secure'
              ? '安全箱：2 格'
              : '容器物品'
        }
      >
        {Array.from({ length: count }, (_, i) => {
          const item = list[i],
            Icon = item
              ? (icons[item.id] ?? Package)
              : area === 'secure'
                ? LockKeyhole
                : Package;
          const key = area + i;
          return (
            <button
              key={key}
              className={
                'inventory-slot ' +
                (item ? item.rarity : 'empty') +
                (selected?.item === item && selected?.area === area
                  ? ' chosen'
                  : '') +
                (over === key ? ' drag-over' : '')
              }
              draggable={!!item}
              aria-label={
                item
                  ? `${item.name}，${item.weight} 千克，${cash(item.value)}`
                  : `空格 ${i + 1}`
              }
              title={
                item
                  ? `${item.name} · ${cash(item.value)} · ${item.weight} kg`
                  : '空格'
              }
              onClick={(e) => {
                if (item) {
                  if (e.shiftKey) {
                    move(
                      { area, item },
                      area === 'secure'
                        ? 'bag'
                        : area === 'bag'
                          ? 'secure'
                          : 'bag',
                    );
                  } else setSelection({ area, item });
                } else if (selected && area !== 'loot') move(selected, area, i);
              }}
              onDoubleClick={() => {
                if (item)
                  move(
                    { area, item },
                    area === 'secure'
                      ? 'bag'
                      : area === 'bag'
                        ? 'secure'
                        : 'bag',
                  );
              }}
              onDragStart={(e) => {
                if (!item) return;
                drag.current = { area, item };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.name);
                setSelection({ area, item });
              }}
              onDragEnd={() => {
                drag.current = null;
                setOver(null);
              }}
              onDragOver={(e) => {
                if (area === 'loot' || !drag.current) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOver(key);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (drag.current && area !== 'loot')
                  move(drag.current, area, i);
                drag.current = null;
                setOver(null);
              }}
            >
              <span className="slot-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Icon size={item ? 27 : 19} strokeWidth={1.5} />
              {item ? (
                <>
                  <strong>{item.name}</strong>
                  <small>{item.weight} kg</small>
                </>
              ) : (
                <span className="empty-label">
                  {area === 'secure' ? '安全格' : '空'}
                </span>
              )}
              {area === 'secure' && item && (
                <LockKeyhole className="slot-lock" size={11} />
              )}
            </button>
          );
        })}
      </div>
    );
  }
  const Icon = selected ? (icons[selected.item.id] ?? Package) : Package;
  return (
    <aside
      className={'inventory-panel ' + (chest ? 'with-loot' : '')}
      aria-label="物品管理"
    >
      <header className="inventory-header">
        <div>
          <span className="eyebrow">FIELD EQUIPMENT / 物品管理</span>
          <h2>随身装备</h2>
        </div>
        <button
          className="icon-button"
          aria-label="关闭物品栏"
          onClick={() => {
            r.closeInventory();
            refresh();
          }}
        >
          <X size={18} />
        </button>
      </header>
      <div className="inventory-summary">
        <span>
          <Backpack size={14} /> 总负重 <b>{r.weight} / 12 kg</b>
        </span>
        <span>
          携带价值 <b>{cash(r.value + r.secureValue)}</b>
        </span>
      </div>
      <div className="inventory-columns">
        {chest && (
          <section className="loot-grid-section">
            <div className="grid-heading">
              <Package size={15} />
              <span>{chest.kind === 'enemy' ? '军用物资箱' : '搜索结果'}</span>
              <b>{chest.items.length} 件</b>
            </div>
            {grid('loot', Math.max(4, chest.items.length))}
            <button
              className="inventory-take-all"
              onClick={() => {
                r.takeAll();
                setSelection(null);
                refresh();
              }}
            >
              全部拾取 <ArrowRight size={15} />
            </button>
            <p className="inventory-tip">
              拖入背包或安全箱
              <br />
              Shift + 点击快速拾取
            </p>
          </section>
        )}
        <div className="personal-inventory">
          <section>
            <div className="grid-heading">
              <Backpack size={15} />
              <span>背包</span>
              <b>{r.bag.length} / 12 格</b>
            </div>
            {grid('bag', 12)}
          </section>
          <section className="secure-section">
            <div className="grid-heading">
              <LockKeyhole size={15} />
              <span>安全箱</span>
              <b>{r.secure.length} / 2 格</b>
            </div>
            <div className="secure-content">
              {grid('secure', 2)}
              <p>
                <LockKeyhole size={17} />
                <strong>死亡保留</strong>
                <span>
                  阵亡 / 超时后
                  <br />
                  物品仍带回仓库
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
      <footer className="inventory-details">
        {selected ? (
          <>
            <div className="selected-item">
              <Icon size={24} />
              <div>
                <strong>{selected.item.name}</strong>
                <span>
                  {selected.item.category} · {selected.item.weight} kg ·{' '}
                  {cash(selected.item.value)}
                </span>
              </div>
              {selected.area === 'secure' && (
                <span className="protected-badge">受保护</span>
              )}
            </div>
            <div className="inventory-actions">
              {selected.area === 'loot' ? (
                <>
                  <button onClick={() => move(selected, 'bag')}>
                    放入背包 <ArrowRight size={13} />
                  </button>
                  <button
                    className="protect"
                    onClick={() => move(selected, 'secure')}
                  >
                    <LockKeyhole size={13} /> 放入安全箱
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={selected.area === 'bag' ? 'protect' : ''}
                    onClick={() =>
                      move(selected, selected.area === 'bag' ? 'secure' : 'bag')
                    }
                  >
                    {selected.area === 'bag' ? (
                      <LockKeyhole size={13} />
                    ) : (
                      <ArrowLeft size={13} />
                    )}{' '}
                    {selected.area === 'bag' ? '放入安全箱' : '移回背包'}
                  </button>
                  <button
                    className="discard"
                    onClick={() => {
                      r.drop(
                        items(selected.area).indexOf(selected.item),
                        selected.area as 'bag' | 'secure',
                      );
                      setSelection(null);
                      refresh();
                    }}
                  >
                    <Trash2 size={13} /> 丢弃
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="inventory-tip">
            点击物品查看操作，拖动整理 / 转移。
            <br />
            每件物品占 1 格；安全箱计入总负重。搜刮时战斗继续。
          </p>
        )}
      </footer>
    </aside>
  );
}
