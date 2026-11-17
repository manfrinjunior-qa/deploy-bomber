import type { CharacterLook, Eyewear, FacialHair, HeadStyle, Outfit, PropKind } from './types';

export const HEAD_LABEL: Record<HeadStyle, string> = {
  quiff: 'Topete',
  pompadour: 'Topete de lado',
  side: 'Cabelo repartido',
  short: 'Cabelo curto',
  crop: 'Cabelo curto',
  plain: 'Cabelo curto',
  fringe: 'Franja',
  shaved: 'Cabelo raspado',
  bald: 'Careca',
  long: 'Cabelo longo',
  bun: 'Coque',
  cowboy: 'Chapéu de cowboy',
  ninja: 'Máscara ninja',
  robot: 'Cabeça de robô',
  helmet: 'Capacete espacial',
};

export const OUTFIT_LABEL: Record<Outfit, string> = {
  shirt: 'Camisa',
  polo: 'Camisa polo',
  tee: 'Camiseta',
  suit: 'Terno',
  dress: 'Vestido',
  jacket: 'Jaqueta',
  vest: 'Colete',
  spacesuit: 'Traje espacial',
  robot: 'Corpo de robô',
};

export const EYEWEAR_LABEL: Record<Eyewear, string> = {
  clear: 'óculos',
  dark: 'óculos de armação escura',
  thick: 'óculos de armação grossa',
  shades: 'óculos escuros',
  'round-shades': 'óculos redondos escuros',
};

export const BEARD_LABEL: Record<FacialHair, string> = {
  full: 'barba cheia',
  short: 'barba curta',
  goatee: 'cavanhaque',
};

export const PROP_LABEL: Record<PropKind, string> = {
  magnifier: 'Lupa',
  card: 'Cartão',
  phone: 'Celular',
  guitar: 'Guitarra',
  briefcase: 'Maleta',
  lasso: 'Laço',
};

export interface LookLine {
  label: string;
  value: string;
}

const sentence = (parts: string[]) => {
  if (!parts.length) return '—';
  const s = parts.join(', ');
  return s[0].toUpperCase() + s.slice(1);
};

/** Aparência em texto (para a tela de Personagens). Recebe o visual já resolvido (com o objeto do papel). */
export function describeLook(look: CharacterLook): LookLine[] {
  const face: string[] = [];
  if (look.eyewear) face.push(EYEWEAR_LABEL[look.eyewear]);
  if (look.beard) face.push(BEARD_LABEL[look.beard]);
  if (look.brows) face.push(look.brows === 'thick' ? 'sobrancelhas grossas' : 'sobrancelhas');
  if (look.smile) face.push('sorriso');

  const extras: string[] = [];
  if (look.headset) extras.push('headset');
  if (look.tie) extras.push('gravata');
  if (look.bandana) extras.push('bandana');
  if (look.logo) extras.push('estampa no peito');

  return [
    { label: 'Cabeça', value: HEAD_LABEL[look.style] },
    { label: 'Roupa', value: OUTFIT_LABEL[look.outfit ?? 'shirt'] },
    { label: 'Rosto', value: sentence(face) },
    { label: 'Acessórios', value: sentence(extras) },
    { label: 'Na mão', value: look.prop ? PROP_LABEL[look.prop.kind] : 'Mãos vazias' },
  ];
}
