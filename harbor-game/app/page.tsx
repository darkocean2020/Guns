'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Anchor,
  ArrowUpRight,
  ArrowRight,
  Package,
  Shield,
  Volume2,
  VolumeX,
  Pause,
  MapPin,
  Crosshair,
  Backpack,
  X,
  Radio,
  Check,
  Skull,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Engine } from '@/lib/engine';
import { registerHarborTools } from '@/lib/webmcp';
import { guns, distance, type Raid } from '@/lib/simulation';
const money = (n: number) => '¥ ' + n.toLocaleString('en-US');
function MapView({ raid, large = false }: { raid: Raid; large?: boolean }) {
  const l = raid.level;
  return (
    <svg
      className={large ? 'map large' : 'map'}
      viewBox="-28 -27 56 54"
      aria-label="港区地图，圆点为你，绿色为撤离点"
    >
      <rect x="-28" y="-27" width="56" height="54" fill="#102c35" />
      <rect x="-25" y="-24" width="50" height="48" fill="#293e44" />
      {l.colliders.map((c, i) => (
        <rect
          key={i}
          x={c.x - c.w / 2}
          y={c.z - c.d / 2}
          width={c.w}
          height={c.d}
          fill={c.name === 'container' ? '#71868a' : '#9b9b83'}
          opacity=".75"
        />
      ))}
      <circle cx="7" cy="-16" r="1.1" fill="#ffba6a" />
      <circle
        cx={l.extraction.x}
        cy={l.extraction.z}
        r="2.5"
        fill="none"
        stroke="#8af2c6"
        strokeWidth=".6"
      />
      <circle cx={raid.player.x} cy={raid.player.z} r="1.1" fill="white" />
      <path
        d={`M ${raid.player.x} ${raid.player.z} l ${Math.sin(raid.angle) * 3} ${-Math.cos(raid.angle) * 3}`}
        stroke="white"
        strokeWidth=".5"
      />
      {large && (
        <>
          <text x="-23" y="-22" fill="#d5e4e4" fontSize="2">
            大井倉庫 04
          </text>
          <text x="6" y="-22" fill="#d5e4e4" fontSize="2">
            海关清单
          </text>
          <text x="-23" y="23" fill="#d5e4e4" fontSize="2">
            南侧入口
          </text>
        </>
      )}
    </svg>
  );
}
export default function Home() {
  const host = useRef<HTMLDivElement>(null),
    [g, setEngine] = useState<Engine | null>(null);
  const [, render] = useState(0);
  const [loading, setLoading] = useState('正在连接东京港区'),
    [error, setError] = useState(''),
    [selected, setSelected] = useState('glock'),
    [gunLoading, setGunLoading] = useState(false),
    [muted, setMuted] = useState(false);
  const refresh = () => render((n) => n + 1);
  useEffect(() => {
    let game: Engine;
    try {
      game = new Engine(host.current!, refresh, setLoading);
      void game
        .load()
        .then(() => setEngine(game))
        .catch((e) => setError(String(e)));
    } catch (e) {
      queueMicrotask(() => setError(String(e)));
    }
    return () => {
      game?.dispose();
    };
  }, []);
  useEffect(() => {
    if (g) return registerHarborTools(g);
  }, [g]);
  const r = g?.raid,
    menu = !r || r.mode === 'menu',
    gun = guns.find((v) => v.id === selected)!;
  async function choose(id: string) {
    if (!g) return;
    setSelected(id);
    setGunLoading(true);
    try {
      await g.selectGun(id);
    } catch {
      setError('枪械模型加载失败，请刷新重试。');
    } finally {
      setGunLoading(false);
    }
  }
  const action = (f: () => void) => {
    f();
    refresh();
  };
  const prompt = r?.atExit
    ? '呼叫撤离快艇'
    : r?.nearby
      ? r.nearby.searched
        ? '打开补给箱'
        : '搜索补给箱'
      : '';
  const progress = r?.search
    ? r.search.progress / 1.2
    : r?.extracting
      ? r.extractProgress / 6
      : r?.healLeft
        ? 1 - r.healLeft / 2
        : r?.reloadLeft
          ? 1 - r.reloadLeft / r.gun.reload
          : 0;
  return (
    <main className={menu ? 'game menu-mode' : 'game raid-mode'}>
      <div ref={host} className="world" />
      {menu && <div className="menu-shade" />}
      <header className="topbar">
        <div className="brand">
          <Anchor size={23} />
          <span>
            HARBOR<span className="brand-zero"> / ZERO</span>
          </span>
          <small>東京港区</small>
        </div>
        <div className="top-actions">
          <span className="status-dot" />
          <span className="edition">单人搜打撤 · LOCAL SAVE</span>
          <button
            className="icon-button"
            aria-label={muted ? '打开声音' : '静音'}
            onClick={() => {
              setMuted(!muted);
              if (g) {
                g.setMuted(!muted);
              }
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {!menu && r?.mode === 'raid' && (
            <button
              className="icon-button"
              aria-label="暂停游戏"
              onClick={() => action(() => r.togglePause())}
            >
              <Pause size={18} />
            </button>
          )}
        </div>
      </header>
      {menu && (
        <>
          <section className="deployment">
            <div className="eyebrow">
              <span>OPERATION 01</span>
              <span>35°36′ N / 139°46′ E</span>
            </div>
            <h1>
              最后一班
              <br />
              <em>离港船。</em>
            </h1>
            <p className="intro">
              雨停了，港口还没睡。
              <br />
              带上装备，找回清单，活着离开大井码头。
            </p>
            <div className="divider" />
            <div className="section-label">
              <span>01 / 出战装备</span>
              <span>{money(r?.profile.credits ?? 6000)}</span>
            </div>
            <div className="gun-list">
              {guns.map((w) => (
                <button
                  key={w.id}
                  className={
                    'gun-option ' + (selected === w.id ? 'selected' : '')
                  }
                  disabled={gunLoading || !!loading}
                  onClick={() => void choose(w.id)}
                >
                  <span>
                    {w.name}
                    <small>{w.category}</small>
                  </span>
                  <span>
                    {w.cost ? money(w.cost) : '免费配发'}
                    {selected === w.id && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="loadout-note">
              <Shield size={15} />
              <span>防弹背心 · 2 份急救包 · {gun.mag * 6} 发弹药</span>
            </div>
            <button
              className="deploy-button"
              disabled={
                !!loading ||
                !!error ||
                gunLoading ||
                (r?.profile.credits ?? 0) < gun.cost
              }
              onClick={() => g?.start()}
            >
              <span>
                {loading
                  ? '准备港区资源…'
                  : gunLoading
                    ? '装配武器…'
                    : '进入港区'}
              </span>
              <ArrowUpRight size={25} />
            </button>
            <p className="risk-note">
              装备押金 {money(gun.cost)}，撤离返还。阵亡丢失本局物资。
            </p>
          </section>
          <aside className="briefing">
            <div className="weather">
              <span className="live-dot" /> 18:42 JST<span>雨后 / 19°C</span>
            </div>
            <div className="location">
              <span>東京 / TOKYO</span>
              <h2>大井埠頭</h2>
              <p>OI CONTAINER TERMINAL</p>
            </div>
            <div className="mission">
              <div className="section-label">
                <span>港务委托</span>
                <Radio size={16} />
              </div>
              <h3>一份没有收件人的清单</h3>
              <p>搜索北侧海关仓库的补给箱，带回货运清单。</p>
              <div className="reward">
                <span>额外报酬</span>
                <b>¥ 2,500</b>
              </div>
            </div>
            <div className="stash">
              <div className="section-label">
                <span>
                  <Package size={15} /> 安全仓库
                </span>
                <b>{r?.profile.stash.length ?? 0} 件</b>
              </div>
              <div className="stash-bottom">
                <span>
                  {money(
                    r?.profile.stash.reduce((s, i) => s + i.value, 0) ?? 0,
                  )}
                  <small>已带回物资总值</small>
                </span>
                <button
                  disabled={!r?.profile.stash.length}
                  onClick={() =>
                    action(() => {
                      r?.sellStash();
                    })
                  }
                >
                  全部出售 <ArrowRight size={14} />
                </button>
              </div>
            </div>
            <div className="record">
              <span>
                行动 <b>{r?.profile.raids ?? 0}</b>
              </span>
              <span>
                撤离 <b>{r?.profile.extractions ?? 0}</b>
              </span>
              <span>
                限时 <b>08:00</b>
              </span>
            </div>
          </aside>
          <footer className="controls">
            <span>
              <kbd>W A S D</kbd> 移动
            </span>
            <span>
              <kbd>鼠标</kbd> 瞄准 / 射击
            </span>
            <span>
              <kbd>E</kbd> 搜索
            </span>
            <span>
              <kbd>R</kbd> 换弹
            </span>
            <span>
              <kbd>H</kbd> 治疗
            </span>
            <span>
              <kbd>Shift</kbd> 冲刺
            </span>
            <span>
              <kbd>Tab</kbd> 背包
            </span>
          </footer>
        </>
      )}
      {!menu && r && (
        <>
          <div
            className={
              'damage-vignette ' +
              (r.elapsed - r.lastDamage < 0.35 ? 'active' : '')
            }
          />
          <section className="vitals">
            <div className="section-label">
              <span>SCAVENGER / 01</span>
              <Shield size={15} />
            </div>
            <div className="health-value">
              {Math.ceil(r.hp)}
              <span>/ 100</span>
            </div>
            <div className="bar health">
              <i style={{ width: r.hp + '%' }} />
            </div>
            <div className="bar stamina">
              <i style={{ width: r.stamina + '%' }} />
            </div>
            <small>
              体力 {Math.ceil(r.stamina)}% · 急救包 {r.medkits}
            </small>
          </section>
          <section className="raid-objective">
            <div className={r.time < 60 ? 'timer urgent' : 'timer'}>
              {Math.floor(r.time / 60)
                .toString()
                .padStart(2, '0')}
              <span>:</span>
              {Math.floor(r.time % 60)
                .toString()
                .padStart(2, '0')}
            </div>
            <span>
              {r.bag.some((i) => i.id === 'manifest')
                ? '✓ 清单已取得，前往撤离'
                : '搜索北侧海关 · 取得货运清单'}
            </span>
          </section>
          <aside className="minimap">
            <button
              onClick={() =>
                action(() => {
                  r.mapOpen = !r.mapOpen;
                })
              }
            >
              <MapView raid={r} />
              <span>
                大井码头 <kbd>M</kbd>
              </span>
            </button>
            <div>
              <MapPin size={14} /> 撤离点{' '}
              {Math.round(distance(r.player, r.level.extraction))} m
            </div>
          </aside>
          <div className="ammo">
            <Crosshair size={20} />
            <div>
              <small>{r.gun.name}</small>
              <strong>
                {r.ammo.toString().padStart(2, '0')}
                <span>/ {r.reserve}</span>
              </strong>
            </div>
            <kbd>R</kbd>
          </div>
          <div className="bag-status">
            <Backpack size={18} />
            <span>{r.weight} / 12 kg</span>
            <b>{money(r.value)}</b>
            <button
              onClick={() =>
                action(() => {
                  r.inventory = !r.inventory;
                  r.openLoot = null;
                })
              }
            >
              <kbd>Tab</kbd>
            </button>
          </div>
          <div className="interaction">
            {progress > 0 ? (
              <div className="action-progress">
                <span>
                  {r.search
                    ? '正在搜索'
                    : r.extracting
                      ? '快艇接应中'
                      : r.healLeft
                        ? '正在包扎'
                        : '正在换弹'}
                </span>
                <div className="bar">
                  <i style={{ width: progress * 100 + '%' }} />
                </div>
              </div>
            ) : prompt && !r.openLoot && !r.inventory ? (
              <button onClick={() => action(() => r.interact())}>
                <kbd>E</kbd>
                {prompt}
              </button>
            ) : null}
            {r.messageUntil > r.elapsed && (
              <p className="notification">{r.message}</p>
            )}
          </div>
          <div className="raid-help">
            Shift 冲刺 <span>·</span> H 治疗 <span>·</span> Esc 暂停
          </div>
          {(r.openLoot || r.inventory) && (
            <aside className="loot-panel">
              <div className="section-label">
                <span>{r.openLoot ? '搜索结果' : '随身背包'}</span>
                <button
                  aria-label="关闭物品栏"
                  onClick={() =>
                    action(() => {
                      r.openLoot = null;
                      r.inventory = false;
                    })
                  }
                >
                  <X size={18} />
                </button>
              </div>
              <h2>{r.openLoot ? '拿走值得带回的。' : '每一格都很重要。'}</h2>
              <p>负重 {r.weight} / 12 kg · 搜刮时战斗仍在继续</p>
              <div className="item-list">
                {(r.openLoot
                  ? (r.loot.find((c) => c.id === r.openLoot)?.items ?? [])
                  : r.bag
                ).map((item, i) => (
                  <button
                    className={'item ' + item.rarity}
                    key={i}
                    onClick={() =>
                      action(() => {
                        if (r.openLoot) r.take(i);
                        else r.drop(i);
                      })
                    }
                  >
                    <Package size={22} />
                    <span>
                      {item.name}
                      <small>
                        {item.category} · {item.weight} kg
                      </small>
                    </span>
                    <span>
                      {money(item.value)}
                      <small>{r.openLoot ? '拾取 ＋' : '丢弃 ×'}</small>
                    </span>
                  </button>
                ))}
              </div>
              {r.openLoot ? (
                <button
                  className="primary"
                  onClick={() => action(() => r.takeAll())}
                >
                  全部拾取 <ArrowRight size={16} />
                </button>
              ) : (
                <p>成功撤离后，背包物品自动进入安全仓库。</p>
              )}
            </aside>
          )}
          {r.mapOpen && (
            <aside className="full-map">
              <div className="section-label">
                <span>TACTICAL MAP / 港区地图</span>
                <button
                  aria-label="关闭地图"
                  onClick={() =>
                    action(() => {
                      r.mapOpen = false;
                    })
                  }
                >
                  <X size={18} />
                </button>
              </div>
              <MapView raid={r} large />
              <p>● 白色：你的位置　● 橙色：委托　◯ 绿色：撤离</p>
            </aside>
          )}
          <Dialog
            open={r.mode === 'paused' || r.mode === 'result'}
            onOpenChange={(open) => {
              if (!open && r.mode === 'paused') action(() => r.togglePause());
            }}
          >
            <DialogContent className="game-dialog" showCloseButton={false}>
              <div className="eyebrow">
                {r.mode === 'paused'
                  ? 'TRANSMISSION PAUSED'
                  : 'RAID REPORT / 行动报告'}
              </div>
              <DialogTitle>
                {r.mode === 'paused'
                  ? '稍作喘息。'
                  : r.result === 'extracted'
                    ? '你赶上了离港船。'
                    : '港口留下了你的装备。'}
              </DialogTitle>
              <DialogDescription>
                {r.mode === 'paused'
                  ? '行动计时与敌人已暂停。准备好后继续。'
                  : r.result === 'extracted'
                    ? '所有随身物资已转入安全仓库，装备押金已返还。'
                    : r.result === 'timeout'
                      ? '最后一班船已离开，本局随身物资丢失。'
                      : '行动失败，本局随身物资丢失。安全仓库不受影响。'}
              </DialogDescription>
              {r.mode === 'result' && (
                <>
                  <div className="result-icon">
                    {r.result === 'extracted' ? (
                      <Anchor size={42} />
                    ) : (
                      <Skull size={42} />
                    )}
                  </div>
                  <div className="result-stats">
                    <div>
                      <small>击败敌人</small>
                      <b>{r.kills}</b>
                    </div>
                    <div>
                      <small>
                        {r.result === 'extracted' ? '带回价值' : '损失物资'}
                      </small>
                      <b>{money(r.value)}</b>
                    </div>
                    <div>
                      <small>委托报酬</small>
                      <b>{money(r.questReward)}</b>
                    </div>
                  </div>
                </>
              )}
              <button
                className="primary"
                onClick={() =>
                  action(() => {
                    if (r.mode === 'paused') r.togglePause();
                    else g?.menu();
                  })
                }
              >
                {r.mode === 'paused' ? '继续行动' : '返回安全屋'}
                <ArrowRight size={18} />
              </button>
              {r.mode === 'paused' && (
                <button
                  className="abandon"
                  onClick={() =>
                    action(() => {
                      r.mode = 'raid';
                      r.finish('dead');
                    })
                  }
                >
                  放弃行动（丢失本局物资）
                </button>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      {loading && !error && (
        <div className="loading-status">
          <span className="spinner" />
          {loading}
        </div>
      )}
      {error && (
        <div className="error-panel">
          <h2>港区连接失败</h2>
          <p>{error}</p>
          <button className="primary" onClick={() => location.reload()}>
            重新连接
          </button>
        </div>
      )}
    </main>
  );
}
