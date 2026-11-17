export type RoleId = 'DEV' | 'QA' | 'PO' | 'COM';
export type StatId = 'speed' | 'range' | 'bombs';
export type Dir = { x: number; y: number };

/** Cabelo ou cobertura da cabeça (robô e capacete substituem a cabeça inteira). */
export type HeadStyle =
  | 'quiff' | 'pompadour' | 'side' | 'short' | 'crop' | 'plain' | 'fringe' | 'shaved' | 'bald'
  | 'long' | 'bun' | 'cowboy' | 'ninja' | 'robot' | 'helmet';
export type Eyewear = 'clear' | 'dark' | 'thick' | 'shades' | 'round-shades';
export type FacialHair = 'full' | 'short' | 'goatee';
/** 'thick' = grossas, coladas nos olhos; 'raised' = curtas, acima dos olhos */
export type Brows = 'thick' | 'raised';
export type Outfit = 'shirt' | 'polo' | 'tee' | 'suit' | 'dress' | 'jacket' | 'vest' | 'spacesuit' | 'robot';
export type PropKind = 'magnifier' | 'card' | 'phone' | 'guitar' | 'briefcase' | 'lasso';

/** Objeto que o personagem segura na mão direita. */
export interface PropDef {
  kind: PropKind;
  color: string;
  /** cor da armação/borda, quando difere da padrão */
  trim?: string;
}

/**
 * Aparência de um personagem (jogadores e chefões do Cliente).
 * As cores de sombra são calculadas; os campos opcionais `shade`, `sole` etc. só existem
 * para os casos em que a arte de referência usa um tom escolhido à mão.
 */
export interface CharacterLook {
  style: HeadStyle;
  skin: string;
  hair: string; // cabelo; no ninja é o capuz, no robô o metal escuro
  shirt: string;
  pants: string;
  shoes: string;
  outfit?: Outfit; // padrão: 'shirt'
  accent?: string; // gola, camisa sob o terno, faixa do vestido
  outer?: string; // colete
  hat?: string; // chapéu, faixa do ninja, antena do robô
  logo?: string; // estampa da camiseta
  tie?: string;
  bandana?: string;
  shade?: string; // sombra da roupa
  sole?: string; // sola do sapato
  pantsShade?: string;
  hairLight?: string; // brilho do cabelo
  eyewear?: Eyewear;
  brows?: Brows;
  smile?: boolean; // sorriso aberto com dentes
  blush?: boolean; // bochechas rosadas (padrão: sim)
  mouth?: string;
  beard?: FacialHair;
  beardColor?: string; // padrão: cor do cabelo
  headset?: boolean;
  /** undefined = usa o objeto do papel; null = mãos vazias */
  prop?: PropDef | null;
}

export interface VariantDef extends CharacterLook {
  name: string;
}

export interface RoleDef {
  id: RoleId;
  name: string;
  fullName: string;
  color: string;
  speed: number;
  range: number;
  bombs: number;
  bombType: string;
  especialId: string;
  tabelaDropId: RoleId;
  finds: string;
  /** objeto padrão na mão de todas as variantes do papel */
  prop?: PropDef;
  /** a primeira variante é a padrão (Personalizado) */
  variants: VariantDef[];
}

export interface SpecialDef {
  id: string;
  name: string;
  efeito: string;
  recarga: number;
  alcance: number;
  duracao?: number;
}

export interface ItemEffect {
  stat?: StatId;
  add?: number;
  flag?: string;
  duration?: number;
}

export interface ItemDef {
  id: string;
  icon: string;
  name: string;
  role: RoleId | 'NEUTRAL';
  kind: 'attr' | 'special' | 'neutral';
  effect: ItemEffect;
  weight: number;
  color: string;
  text: string;
  border?: string;
  desc: string;
}

export type DropTable = [string, number][];

export interface EnemyDef {
  id: EnemyType;
  name: string;
  vida: number;
  speed: number;
  touch: 'damage' | 'freeze' | 'swap';
  freeze?: number;
  splitAfter?: number;
  score: number;
  ia: 'wander' | 'chase';
}
export type EnemyType = 'bug' | 'meeting' | 'leak' | 'merge';

export interface Theme {
  floorA: string;
  floorB: string;
  border: string;
  rack: string;
  rackLight: string;
}

export interface ArenaDef {
  nome: string;
  inimigos?: number;
  mapa: string[];
}

export interface StageDef {
  id: number;
  name: string;
  desc: string;
  theme: Theme;
  inimigos: EnemyType[];
  mecanica: string;
  chefao: string;
  color: string;
  arenas: ArenaDef[];
  bossArena: ArenaDef;
}

export interface BossAttack {
  type: string;
  name: string;
  interval: number;
  enemy?: EnemyType;
  count?: number;
  duration?: number;
  tiles?: number;
  delay?: number;
}

export interface BossDef {
  id: string;
  name: string;
  sprite: string;
  variant?: CharacterLook;
  arena?: string;
  theme?: string;
  resistencia: number;
  speed: number;
  final?: boolean;
  attacks: BossAttack[];
}

export type GameMode = 'story' | 'battle' | 'client';

export interface PlayerSetup {
  slot: number;
  role: RoleId;
  variant: number;
}

export interface PlayerInput {
  dx: number;
  dy: number;
  /** com duas direções seguradas, qual eixo foi apertado por último */
  prefer?: 'h' | 'v';
  bomb: boolean; // pressionado neste frame
  special: boolean; // pressionado neste frame
}

export const EMPTY_INPUT: PlayerInput = { dx: 0, dy: 0, bomb: false, special: false };
