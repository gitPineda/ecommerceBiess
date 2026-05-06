export const PRODUCT_CATEGORY_META = {
  audio: {
    label: 'Audio',
    icon: 'headset-outline',
  },
  wearables: {
    label: 'Wearables',
    icon: 'watch-outline',
  },
  accesorios: {
    label: 'Accesorios',
    icon: 'briefcase-outline',
  },
  computo: {
    label: 'Computo',
    icon: 'laptop-outline',
  },
  'hogar-inteligente': {
    label: 'Hogar Inteligente',
    icon: 'home-outline',
  },
  gaming: {
    label: 'Gaming',
    icon: 'game-controller-outline',
  },
  fotografia: {
    label: 'Fotografia',
    icon: 'camera-outline',
  },
  oficina: {
    label: 'Oficina',
    icon: 'document-text-outline',
  },
  movilidad: {
    label: 'Movilidad',
    icon: 'bicycle-outline',
  },
  lifestyle: {
    label: 'Lifestyle',
    icon: 'leaf-outline',
  },
  despensa: {
    label: 'Despensa',
    icon: 'basket-outline',
  },
  bebidas: {
    label: 'Bebidas',
    icon: 'wine-outline',
  },
  snacks: {
    label: 'Snacks',
    icon: 'fast-food-outline',
  },
  hogar: {
    label: 'Hogar',
    icon: 'home-outline',
  },
};

export const PRODUCT_CATEGORY_ICON_OPTIONS = [
  { id: 'cube-outline', label: 'General' },
  { id: 'basket-outline', label: 'Despensa' },
  { id: 'wine-outline', label: 'Bebidas' },
  { id: 'fast-food-outline', label: 'Snacks' },
  { id: 'home-outline', label: 'Hogar' },
  { id: 'headset-outline', label: 'Audio' },
  { id: 'watch-outline', label: 'Wearables' },
  { id: 'briefcase-outline', label: 'Accesorios' },
  { id: 'laptop-outline', label: 'Computo' },
  { id: 'camera-outline', label: 'Fotografia' },
  { id: 'game-controller-outline', label: 'Gaming' },
  { id: 'document-text-outline', label: 'Oficina' },
  { id: 'bicycle-outline', label: 'Movilidad' },
  { id: 'leaf-outline', label: 'Lifestyle' },
];

export function getCategoryMeta(categoryId, fallbackLabel = 'General', iconOverride = '') {
  if (iconOverride) {
    return {
      label: fallbackLabel,
      icon: iconOverride,
    };
  }

  return (
    PRODUCT_CATEGORY_META[categoryId] || {
      label: fallbackLabel,
      icon: 'cube-outline',
    }
  );
}
