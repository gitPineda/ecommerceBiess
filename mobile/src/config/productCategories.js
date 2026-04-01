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
};

export function getCategoryMeta(categoryId, fallbackLabel = 'General') {
  return (
    PRODUCT_CATEGORY_META[categoryId] || {
      label: fallbackLabel,
      icon: 'cube-outline',
    }
  );
}
