import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

const STAGE_WIDTH = 1180;
const STAGE_HEIGHT = 620;
const LAYOUT_STORAGE_KEY = "simulator-stage-layout";

const scenes = [
  {
    id: "henesys",
    label: "Henesys",
    skyTop: "#8bc6ff",
    skyBottom: "#dfd7e2",
    glow: "#fff6b0",
    hill: "#83bf6d",
    ridge: "#5e913d",
    platform: "#6aaa34",
    earth: "#7b6423"
  },
  {
    id: "ellinia",
    label: "Ellinia",
    skyTop: "#7ea7f6",
    skyBottom: "#c7bfd8",
    glow: "#d6edff",
    hill: "#5da880",
    ridge: "#447a5d",
    platform: "#7dc95a",
    earth: "#6f5d26"
  },
  {
    id: "ludibrium",
    label: "Ludibrium",
    skyTop: "#9fb9ff",
    skyBottom: "#d9cce7",
    glow: "#ffe0f3",
    hill: "#8dc4a2",
    ridge: "#6f8ec4",
    platform: "#7bd05f",
    earth: "#7b6423"
  }
] as const;

const paletteItems = [
  { id: "hero", label: "Hero", group: "Character", tone: "#dde8ff", accent: "#4b6fd1", shape: "character" },
  { id: "archer", label: "Archer", group: "Character", tone: "#e7f0d7", accent: "#5b8a43", shape: "character" },
  { id: "mage", label: "Mage", group: "Character", tone: "#efe5ff", accent: "#6a57c4", shape: "character" },
  { id: "snail", label: "Snail", group: "Pet", tone: "#ffd4b5", accent: "#cb6f39", shape: "pet" },
  { id: "bunny", label: "Bunny", group: "Pet", tone: "#ffdff3", accent: "#d45fa8", shape: "pet" },
  { id: "mushroom", label: "Mushroom", group: "Monster", tone: "#ffd9af", accent: "#d7772b", shape: "monster" },
  { id: "slime", label: "Slime", group: "Monster", tone: "#d4ffc6", accent: "#47a845", shape: "monster" },
  { id: "flower", label: "Sunflowers", group: "Prop", tone: "#fff0a8", accent: "#d59b13", shape: "prop" },
  { id: "stump", label: "Stump", group: "Prop", tone: "#d7bb93", accent: "#7c5533", shape: "prop" },
  { id: "sign", label: "Sign", group: "Prop", tone: "#eddcb0", accent: "#8d6b43", shape: "prop" }
] as const;

type PaletteItem = (typeof paletteItems)[number];

type SceneEntity = {
  id: string;
  typeId: PaletteItem["id"];
  x: number;
  y: number;
  scale: number;
  flipped: boolean;
  zIndex: number;
};

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

const initialEntities: SceneEntity[] = [
  { id: "entity-hero", typeId: "hero", x: 470, y: 404, scale: 1.05, flipped: false, zIndex: 4 },
  { id: "entity-bunny", typeId: "bunny", x: 536, y: 434, scale: 0.9, flipped: false, zIndex: 5 },
  { id: "entity-archer", typeId: "archer", x: 468, y: 318, scale: 0.96, flipped: false, zIndex: 6 },
  { id: "entity-mushroom", typeId: "mushroom", x: 493, y: 174, scale: 0.88, flipped: false, zIndex: 7 },
  { id: "entity-flower", typeId: "flower", x: 112, y: 448, scale: 1.08, flipped: false, zIndex: 2 },
  { id: "entity-stump", typeId: "stump", x: 590, y: 222, scale: 1.04, flipped: false, zIndex: 3 }
];

export function SimulatorStudio() {
  const [sceneId, setSceneId] = useState<(typeof scenes)[number]["id"]>("henesys");
  const [entities, setEntities] = useState<SceneEntity[]>(initialEntities);
  const [selectedId, setSelectedId] = useState<string | null>(initialEntities[0]?.id ?? null);
  const [hoveredPaletteId, setHoveredPaletteId] = useState<PaletteItem["id"] | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const scene = useMemo(() => scenes.find((item) => item.id === sceneId) ?? scenes[0], [sceneId]);
  const selectedEntity = useMemo(() => entities.find((item) => item.id === selectedId) ?? null, [entities, selectedId]);
  const hoveredPaletteItem = useMemo(
    () => paletteItems.find((item) => item.id === hoveredPaletteId) ?? null,
    [hoveredPaletteId]
  );

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      const bounds = stage.getBoundingClientRect();
      const nextX = event.clientX - bounds.left - dragState.offsetX;
      const nextY = event.clientY - bounds.top - dragState.offsetY;

      setEntities((current) =>
        current.map((item) =>
          item.id === dragState.id
            ? {
                ...item,
                x: clamp(nextX, 0, STAGE_WIDTH - 84),
                y: clamp(nextY, 0, STAGE_HEIGHT - 118)
              }
            : item
        )
      );
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const handleEntityPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, entity: SceneEntity) => {
    const targetBounds = event.currentTarget.getBoundingClientRect();
    setSelectedId(entity.id);
    setDragState({
      id: entity.id,
      offsetX: event.clientX - targetBounds.left,
      offsetY: event.clientY - targetBounds.top
    });
  };

  const handleAddEntity = (item: PaletteItem) => {
    const nextEntity: SceneEntity = {
      id: `entity-${item.id}-${Date.now()}`,
      typeId: item.id,
      x: 520 + entities.length * 6,
      y: item.group === "Prop" ? 420 : 390,
      scale: item.shape === "prop" ? 1.08 : 1,
      flipped: false,
      zIndex: entities.length + 2
    };

    setEntities((current) => [...current, nextEntity]);
    setSelectedId(nextEntity.id);
  };

  const handleRemoveSelected = () => {
    if (!selectedEntity) {
      return;
    }

    setEntities((current) => current.filter((item) => item.id !== selectedEntity.id));
    setSelectedId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedEntity) {
      return;
    }

    const duplicate: SceneEntity = {
      ...selectedEntity,
      id: `${selectedEntity.id}-copy-${Date.now()}`,
      x: clamp(selectedEntity.x + 36, 0, STAGE_WIDTH - 84),
      y: clamp(selectedEntity.y + 18, 0, STAGE_HEIGHT - 118),
      zIndex: entities.length + 2
    };

    setEntities((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
  };

  const handleFlipSelected = () => {
    if (!selectedEntity) {
      return;
    }

    setEntities((current) =>
      current.map((item) => (item.id === selectedEntity.id ? { ...item, flipped: !item.flipped } : item))
    );
  };

  const handleScaleSelected = (delta: number) => {
    if (!selectedEntity) {
      return;
    }

    setEntities((current) =>
      current.map((item) =>
        item.id === selectedEntity.id ? { ...item, scale: clamp(item.scale + delta, 0.7, 1.55) } : item
      )
    );
  };

  const handleSaveLayout = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        sceneId,
        entities
      })
    );
  };

  const handleLoadLayout = () => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as { sceneId?: string; entities?: SceneEntity[] };
      if (saved.sceneId && scenes.some((item) => item.id === saved.sceneId)) {
        setSceneId(saved.sceneId as (typeof scenes)[number]["id"]);
      }
      if (Array.isArray(saved.entities) && saved.entities.length) {
        setEntities(saved.entities);
        setSelectedId(saved.entities[0]?.id ?? null);
      }
    } catch {
      return;
    }
  };

  const handleResetLayout = () => {
    setSceneId("henesys");
    setEntities(initialEntities);
    setSelectedId(initialEntities[0]?.id ?? null);
  };

  return (
    <section className="simulator-editor reveal-on-scroll" data-reveal>
      <div className="simulator-editor__toolbar">
        <div>
          <span className="section-header__eyebrow">Simulator</span>
          <h2>Scene Builder</h2>
          <p>Place sprites, drag them across the stage, and build a Maple-style scene with a bottom asset tray.</p>
        </div>
        <div className="simulator-editor__toolbar-actions">
          {scenes.map((item) => (
            <button
              className={`simulator-editor__scene-chip ${sceneId === item.id ? "is-active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => setSceneId(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="simulator-editor__action" type="button" onClick={handleSaveLayout}>
            Save
          </button>
          <button className="simulator-editor__action" type="button" onClick={handleLoadLayout}>
            Load
          </button>
          <button className="simulator-editor__action simulator-editor__action--ghost" type="button" onClick={handleResetLayout}>
            Reset
          </button>
        </div>
      </div>

      <div className="simulator-editor__shell">
        <div className="simulator-editor__viewport-shell">
          <div
            className={`simulator-editor__viewport simulator-editor__viewport--${scene.id}`}
            ref={stageRef}
            style={
              {
                "--scene-sky-top": scene.skyTop,
                "--scene-sky-bottom": scene.skyBottom,
                "--scene-glow": scene.glow,
                "--scene-hill": scene.hill,
                "--scene-ridge": scene.ridge,
                "--scene-platform": scene.platform,
                "--scene-earth": scene.earth
              } as CSSProperties
            }
          >
            <div className="simulator-editor__sky" />
            <div className="simulator-editor__mist" />
            <div className="simulator-editor__cloud simulator-editor__cloud--one" />
            <div className="simulator-editor__cloud simulator-editor__cloud--two" />
            <div className="simulator-editor__hill simulator-editor__hill--left" />
            <div className="simulator-editor__hill simulator-editor__hill--right" />
            <div className="simulator-editor__platform simulator-editor__platform--top" />
            <div className="simulator-editor__platform simulator-editor__platform--mid" />
            <div className="simulator-editor__terrain simulator-editor__terrain--main" />
            <div className="simulator-editor__terrain simulator-editor__terrain--lower" />
            <div className="simulator-editor__landmark">
              <div className="simulator-editor__landmark-roof" />
              <div className="simulator-editor__landmark-house" />
              <div className="simulator-editor__landmark-door" />
              <div className="simulator-editor__landmark-window" />
              <div className="simulator-editor__landmark-stack" />
            </div>

            {entities.map((entity) => {
              const meta = paletteItems.find((item) => item.id === entity.typeId) ?? paletteItems[0];

              return (
                <button
                  aria-label={meta.label}
                  className={`simulator-editor__entity simulator-editor__entity--${meta.shape} ${selectedId === entity.id ? "is-selected" : ""}`}
                  key={entity.id}
                  style={
                    {
                      "--entity-tone": meta.tone,
                      "--entity-accent": meta.accent,
                      left: entity.x,
                      top: entity.y,
                      zIndex: entity.zIndex,
                      transform: `${entity.flipped ? "scaleX(-1) " : ""}scale(${entity.scale})`
                    } as CSSProperties
                  }
                  type="button"
                  onClick={() => setSelectedId(entity.id)}
                  onPointerDown={(event) => handleEntityPointerDown(event, entity)}
                >
                  <span className="simulator-editor__entity-sprite" />
                  <span className="simulator-editor__entity-label">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="simulator-editor__coordinates">
            <span>{selectedEntity ? `${Math.round(selectedEntity.x)}, ${Math.round(selectedEntity.y)}` : "No selection"}</span>
            <span>{entities.length} placed</span>
          </div>
        </div>

        <aside className="simulator-editor__inspector">
          <div className="simulator-editor__inspector-card">
            <strong>Selection</strong>
            <span>{selectedEntity ? (paletteItems.find((item) => item.id === selectedEntity.typeId)?.label ?? "Entity") : "Pick a sprite"}</span>
            <div className="simulator-editor__inspector-actions">
              <button className="simulator-editor__mini-action" type="button" onClick={handleDuplicateSelected} disabled={!selectedEntity}>
                Duplicate
              </button>
              <button className="simulator-editor__mini-action" type="button" onClick={handleFlipSelected} disabled={!selectedEntity}>
                Flip
              </button>
              <button className="simulator-editor__mini-action" type="button" onClick={() => handleScaleSelected(0.08)} disabled={!selectedEntity}>
                Scale +
              </button>
              <button className="simulator-editor__mini-action" type="button" onClick={() => handleScaleSelected(-0.08)} disabled={!selectedEntity}>
                Scale -
              </button>
              <button className="simulator-editor__mini-action simulator-editor__mini-action--danger" type="button" onClick={handleRemoveSelected} disabled={!selectedEntity}>
                Remove
              </button>
            </div>
          </div>

          <div className="simulator-editor__inspector-card">
            <strong>Tray Preview</strong>
            {hoveredPaletteItem ? (
              <>
                <span>{hoveredPaletteItem.label}</span>
                <small>{hoveredPaletteItem.group}</small>
              </>
            ) : (
              <>
                <span>Hover a tray item</span>
                <small>Preview appears here before you add it to the stage.</small>
              </>
            )}
          </div>
        </aside>
      </div>

      <div className="simulator-editor__tray">
        <div className="simulator-editor__tray-head">
          <strong>Asset Tray</strong>
          <span>Click an item to place it on the stage</span>
        </div>
        <div className="simulator-editor__tray-grid">
          {paletteItems.map((item) => (
            <button
              className="simulator-editor__tray-item"
              key={item.id}
              type="button"
              onClick={() => handleAddEntity(item)}
              onMouseEnter={() => setHoveredPaletteId(item.id)}
              onMouseLeave={() => setHoveredPaletteId((current) => (current === item.id ? null : current))}
              style={{ "--entity-tone": item.tone, "--entity-accent": item.accent } as CSSProperties}
            >
              <span className={`simulator-editor__tray-thumb simulator-editor__tray-thumb--${item.shape}`} />
              <strong>{item.label}</strong>
              <small>{item.group}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
