import type { RectZone } from "../model/types";
import { SUSHI_SHOP_BUILDING_ID } from "./cityMap";

interface OpaqueBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BuildingAssetDefinition {
  id: string;
  src: string;
  width: number;
  height: number;
  opaqueBounds: OpaqueBounds;
}

export const BUILDING_ASSETS: BuildingAssetDefinition[] = [
  {
    id: "sushi-shop",
    src: "/assets/buildings/sushiShop.png",
    width: 230,
    height: 150,
    opaqueBounds: { left: 0.03, top: 0.04, right: 0.97, bottom: 0.98 }
  },
  {
    id: "medium-02",
    src: "/assets/buildings/DQ-SF_city_building_medium_02.png",
    width: 698,
    height: 483,
    opaqueBounds: { left: 0.0029, top: 0.0021, right: 0.9986, bottom: 0.9959 }
  },
  {
    id: "medium-06",
    src: "/assets/buildings/DQ-SF_city_building_medium_06.png",
    width: 734,
    height: 693,
    opaqueBounds: { left: 0.0027, top: 0.0029, right: 0.9973, bottom: 0.9971 }
  },
  {
    id: "medium-08",
    src: "/assets/buildings/DQ-SF_city_building_medium_08.png",
    width: 580,
    height: 660,
    opaqueBounds: { left: 0.0017, top: 0.0015, right: 0.9966, bottom: 0.9985 }
  },
  {
    id: "small-02",
    src: "/assets/buildings/DQ-SF_city_building_small_02.png",
    width: 361,
    height: 262,
    opaqueBounds: { left: 0.0055, top: 0.0076, right: 0.9945, bottom: 0.9962 }
  },
  {
    id: "small-05",
    src: "/assets/buildings/DQ-SF_city_building_small_05.png",
    width: 374,
    height: 377,
    opaqueBounds: { left: 0.0027, top: 0.0053, right: 0.9947, bottom: 0.9973 }
  },
  {
    id: "small-06",
    src: "/assets/buildings/DQ-SF_city_building_small_06.png",
    width: 385,
    height: 320,
    opaqueBounds: { left: 0.0026, top: 0.0063, right: 0.9948, bottom: 0.9938 }
  },
  {
    id: "small-07",
    src: "/assets/buildings/DQ-SF_city_building_small_07.png",
    width: 385,
    height: 330,
    opaqueBounds: { left: 0.0052, top: 0.003, right: 0.9948, bottom: 0.9939 }
  },
  {
    id: "small-12",
    src: "/assets/buildings/DQ-SF_city_building_small_12.png",
    width: 386,
    height: 320,
    opaqueBounds: { left: 0.0052, top: 0.0063, right: 0.9974, bottom: 0.9938 }
  }
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getBuildingAsset = (building: Pick<RectZone, "id" | "x" | "y">): BuildingAssetDefinition => {
  if (building.id === SUSHI_SHOP_BUILDING_ID) {
    return BUILDING_ASSETS[0]!;
  }

  const key = building.id || `${building.x}-${building.y}`;
  const genericAssets = BUILDING_ASSETS.slice(1);
  const index = hashString(key) % genericAssets.length;
  return genericAssets[index]!;
};

export const getBuildingDrawRect = (building: RectZone): RectZone => {
  const asset = getBuildingAsset(building);
  const imageAspectRatio = asset.width / asset.height;
  const targetAspectRatio = building.width / building.height;

  let drawWidth = building.width;
  let drawHeight = building.height;

  if (imageAspectRatio > targetAspectRatio) {
    drawHeight = building.width / imageAspectRatio;
  } else {
    drawWidth = building.height * imageAspectRatio;
  }

  return {
    id: building.id,
    x: building.x + (building.width - drawWidth) / 2,
    y: building.y + building.height - drawHeight,
    width: drawWidth,
    height: drawHeight
  };
};

export const getBuildingCollisionRect = (building: RectZone): RectZone => {
  const drawRect = getBuildingDrawRect(building);
  const { opaqueBounds } = getBuildingAsset(building);

  return {
    id: building.id,
    x: drawRect.x + drawRect.width * opaqueBounds.left,
    y: drawRect.y + drawRect.height * opaqueBounds.top,
    width: drawRect.width * (opaqueBounds.right - opaqueBounds.left),
    height: drawRect.height * (opaqueBounds.bottom - opaqueBounds.top)
  };
};
