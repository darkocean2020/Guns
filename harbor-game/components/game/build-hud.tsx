'use client';
import {
  Hammer,
  Layers,
  BrickWall,
  Footprints,
  RotateCw,
  Axe,
  TreePine,
  Anvil,
  HeartPulse,
} from 'lucide-react';
import { blueprints, type BuildKind, type Raid } from '@/lib/simulation';
export function BuildHud({
  raid: r,
  refresh,
}: {
  raid: Raid;
  refresh: () => void;
}) {
  const icons = { wall: BrickWall, floor: Layers, stairs: Footprints };
  const act = (fn: () => void) => {
    fn();
    refresh();
  };
  return (
    <>
      <div className="field-actions-hud">
        <div className="materials-hud">
          <span>
            <TreePine size={15} /> 木料 <b>{r.wood}</b>
          </span>
          <span>
            <Anvil size={15} /> 金属 <b>{r.scrap}</b>
          </span>
          <button
            className={r.buildMode ? 'active' : ''}
            onClick={() => act(() => r.toggleBuild())}
          >
            <Hammer size={15} />
            <kbd>B</kbd>
          </button>
        </div>
        <div className="medkit-hud">
          <button
            aria-label="使用急救包（H）"
            disabled={
              r.mode !== 'raid' ||
              r.hp >= 100 ||
              r.medkits === 0 ||
              r.healLeft > 0
            }
            onClick={() => act(() => r.heal())}
          >
            <HeartPulse size={16} />
            <span>
              {r.healLeft > 0 ? '正在包扎…' : '急救包'} <b>× {r.medkits}</b>
            </span>
            <kbd>H</kbd>
          </button>
          <p>包扎 2 秒 · 恢复 55 点生命</p>
          <small>受击会中断，未完成不消耗</small>
        </div>
      </div>
      {r.buildMode && (
        <section className="build-toolbar">
          <header>
            <span>
              <Hammer size={15} /> 野外建造
            </span>
            <small>{r.buildings.length}/40 · 本局临时建筑</small>
          </header>
          <div className="blueprint-list">
            {(Object.keys(blueprints) as BuildKind[]).map((kind, i) => {
              const plan = blueprints[kind],
                Icon = icons[kind];
              return (
                <button
                  className={r.buildKind === kind ? 'chosen' : ''}
                  key={kind}
                  onClick={() => act(() => r.chooseBuild(kind))}
                >
                  <kbd>{i + 1}</kbd>
                  <Icon size={22} />
                  <strong>{plan.name}</strong>
                  <span>
                    木料 {plan.wood} / 金属 {plan.scrap}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={r.buildReason() ? 'invalid' : 'valid'}>
            {r.buildReason() || '位置可用 · 左键建造'}
          </p>
          {r.selectedBuilding && (
            <div className="structure-health">
              目标：{blueprints[r.selectedBuilding.kind].name}
              <span>
                耐久 {Math.max(0, r.selectedBuilding.hp)} /{' '}
                {blueprints[r.selectedBuilding.kind].hp}
              </span>
            </div>
          )}
          <footer>
            <button onClick={() => act(() => r.rotateBuild())}>
              <RotateCw size={13} />
              <kbd>R</kbd> 旋转
            </button>
            <button onClick={() => act(() => r.demolish())}>
              <Axe size={13} />
              <kbd>X</kbd> 拆除返半
            </button>
            <span>
              <kbd>B / Esc</kbd> 退出
            </span>
          </footer>
        </section>
      )}
    </>
  );
}
