/**
 * de_dust2 风格竞技场 — 商业化重制版
 * 布局：T 出生点（北） / CT 出生点（南） / 中路+中门 /
 *       A 包点（西北，高地+台阶）/ A 大道（西侧长廊） /
 *       B 包点（东南，围栏区）/ B 洞通道（东侧）
 * 全部结构生成 AABB 碰撞体；拱门、桶、箱堆增强战场质感
 */
import * as THREE from 'three'
import type { ColliderBox, MapData, SpawnPoint } from './types'

interface BuildCtx {
  map: THREE.Group
  colliders: ColliderBox[]
}

function addBox(
  ctx: BuildCtx,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  mat: THREE.Material,
  solid = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)
  mesh.position.set(x, y, z)
  ctx.map.add(mesh)
  if (solid) {
    ctx.colliders.push({
      min: { x: x - sx / 2, y: y - sy / 2, z: z - sz / 2 },
      max: { x: x + sx / 2, y: y + sy / 2, z: z + sz / 2 },
    })
  }
}

/** 沙漠拱门：两根方柱 + 顶梁 */
function addArch(ctx: BuildCtx, x: number, z: number, width: number, mat: THREE.Material, alongX = true) {
  const pillarSx = alongX ? 1.2 : 1.2
  const pillarSz = alongX ? 1.2 : 1.2
  const half = width / 2
  const px = alongX ? x - half : x
  const pz = alongX ? z : z - half
  addBox(ctx, px, 1.7, pz, pillarSx, 3.4, pillarSz, mat)
  addBox(ctx, alongX ? x + half : x, 1.7, alongX ? z : z + half, pillarSx, 3.4, pillarSz, mat)
  // 顶梁（高于头部，仅视觉+顶部碰撞）
  addBox(
    ctx,
    alongX ? x : x,
    3.75,
    alongX ? z : z,
    alongX ? width + pillarSx : 1.4,
    0.7,
    alongX ? 1.4 : width + pillarSz,
    mat,
  )
}

/** 油桶：圆柱网格 + 近似方形碰撞 */
function addBarrel(ctx: BuildCtx, x: number, z: number, color: number) {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.45 }),
  )
  barrel.position.set(x, 0.575, z)
  ctx.map.add(barrel)
  // 两圈箍
  for (const hy of [0.25, 0.9]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.03, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(x, hy, z)
    ctx.map.add(ring)
  }
  ctx.colliders.push({
    min: { x: x - 0.42, y: 0, z: z - 0.42 },
    max: { x: x + 0.42, y: 1.15, z: z + 0.42 },
  })
}

/** 木箱堆：大小错落更有战场感 */
function crateStack(ctx: BuildCtx, x: number, z: number, mat: THREE.Material, dark: THREE.Material) {
  addBox(ctx, x, 0.65, z, 1.7, 1.3, 1.7, mat)
  addBox(ctx, x + 1.55, 0.5, z + 0.4, 1.1, 1.0, 1.1, dark)
  if (Math.random() > 0.4) {
    addBox(ctx, x - 0.2, 1.85, z + 0.1, 0.95, 0.95, 0.95, dark)
  }
}

function spawn(x: number, z: number, yaw: number): SpawnPoint {
  return { position: { x, y: 1.6, z }, yaw }
}

export function createDust2Map(): MapData {
  const ctx: BuildCtx = {
    map: new THREE.Group(),
    colliders: [],
  }
  const { map } = ctx

  // —— 材质（dust2 沙漠色系）——
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcdbb88, roughness: 0.92 })
  const wallDarkMat = new THREE.MeshStandardMaterial({ color: 0xb39f70, roughness: 0.94 })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc4ad76, roughness: 0.96 })
  const floorMidMat = new THREE.MeshStandardMaterial({ color: 0xbaa26c, roughness: 0.96 })
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8f7448, roughness: 0.86 })
  const crateDarkMat = new THREE.MeshStandardMaterial({ color: 0x6e5632, roughness: 0.88 })
  const siteAMat = new THREE.MeshStandardMaterial({ color: 0x33507e, roughness: 0.8 })
  const siteBMat = new THREE.MeshStandardMaterial({ color: 0x7e3b32, roughness: 0.8 })
  const platMat = new THREE.MeshStandardMaterial({ color: 0xd6c493, roughness: 0.9 })
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5f4a2e, roughness: 0.85 })

  // —— 地面 ——
  addBox(ctx, 0, -1, 0, 124, 2, 124, floorMat)

  // 中路地板色带
  const midFloor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.06, 66), floorMidMat)
  midFloor.position.set(0, 0.03, 0)
  map.add(midFloor)

  // —— 外围墙 ——
  const wallH = 11
  const wallT = 2
  addBox(ctx, 0, wallH / 2 - 1, -62, 124, wallH, wallT, wallMat)
  addBox(ctx, 0, wallH / 2 - 1, 62, 124, wallH, wallT, wallMat)
  addBox(ctx, -62, wallH / 2 - 1, 0, wallT, wallH, 124, wallMat)
  addBox(ctx, 62, wallH / 2 - 1, 0, wallT, wallH, 124, wallMat)

  /* ===================== 中路 & 中门 ===================== */
  // 中路侧墙（左：通往 A 短墙留缺口；右：通往 B 缺口）
  addBox(ctx, -11, 2, -18, 1.6, 4, 26, wallDarkMat) // 西墙上半（z:-31~-5）
  addBox(ctx, -11, 2, 14, 1.6, 4, 28, wallDarkMat)  // 西墙下半（z:0~28）
  addBox(ctx, 11, 2, -14, 1.6, 4, 28, wallDarkMat)  // 东墙上半（z:-28~0）
  addBox(ctx, 11, 2, 18, 1.6, 4, 26, wallDarkMat)   // 东墙下半（z:5~31）

  // 中门：z=0 双扇门板，中间 1.8m 门缝
  addBox(ctx, -3.4, 1.6, 0, 3.2, 3.2, 0.5, doorMat)
  addBox(ctx, 3.4, 1.6, 0, 3.2, 3.2, 0.5, doorMat)
  addArch(ctx, 0, 0, 8.6, wallDarkMat)

  // 中路掩体
  addBox(ctx, -5, 0.75, 12, 2.2, 1.5, 2.2, crateMat)
  addBarrel(ctx, 6.2, -9, 0x7a4b2c)
  addBarrel(ctx, 7.1, -9.6, 0x4b5a68)

  /* ===================== A 包点（西北高地）===================== */
  const aCx = -34
  const aCz = -34
  const aPlat = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 24), siteAMat)
  aPlat.position.set(aCx, 0.07, aCz)
  map.add(aPlat)

  // A 高台（可站上去）
  addBox(ctx, aCx - 4, 0.75, aCz - 4, 16, 1.5, 16, platMat)

  // 台阶（三级，从东侧上）
  addBox(ctx, aCx + 5.4, 0.3, aCz - 2, 3, 0.6, 3.2, platMat)
  addBox(ctx, aCx + 7, 0.55, aCz - 2, 3, 1.1, 3.2, platMat)
  addBox(ctx, aCx + 8.6, 0.8, aCz - 2, 3, 1.6, 3.2, platMat)

  // Goose 大箱 + 默认箱阵
  addBox(ctx, aCx - 8, 2.55, aCz - 8, 2.4, 2.1, 2.4, crateMat)
  crateStack(ctx, aCx + 2, aCz + 6, crateMat, crateDarkMat)
  crateStack(ctx, aCx - 9, aCz + 3, crateMat, crateDarkMat)
  addBarrel(ctx, aCx + 7, aCz - 8, 0x516b4a)

  // A 点围墙（西北角封死，南面留坡道口）
  addBox(ctx, aCx - 13, 2.5, aCz, 1.6, 5, 26, wallMat)
  addBox(ctx, aCx, 2.5, aCz - 13, 28, 5, 1.6, wallMat)

  /* ================ A 大道（西长廊）================ */
  // 走廊两壁：从 T 半场绕到 A 南侧
  addBox(ctx, -50, 2, -36, 1.6, 4, 40, wallDarkMat) // 内壁
  addBox(ctx, -57.5, 2, 6, 9, 4, 1.6, wallMat)      // 长廊南端折墙
  addArch(ctx, -53, -14, 7, wallDarkMat)            // 长门拱
  crateStack(ctx, -53.5, -24, crateMat, crateDarkMat)
  addBarrel(ctx, -51, -30, 0x7a4b2c)

  // A 短墙缺口 → catwalk 台阶上 A 平台
  addBox(ctx, -17, 0.4, -12, 3.4, 0.8, 4, platMat)
  addBox(ctx, -21, 0.8, -14, 3.4, 1.6, 4, platMat)
  addBox(ctx, -25, 1.15, -17, 3.6, 2.3, 4, platMat)

  /* ===================== B 包点（东南围栏区）===================== */
  const bCx = 34
  const bCz = 34
  const bPlat = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 24), siteBMat)
  bPlat.position.set(bCx, 0.07, bCz)
  map.add(bPlat)

  addBox(ctx, bCx, 0.75, bCz - 5, 18, 1.5, 12, platMat)
  // 台阶（西侧上）
  addBox(ctx, bCx - 11.4, 0.3, bCz - 4, 3, 0.6, 3.2, platMat)
  addBox(ctx, bCx - 13, 0.55, bCz - 4, 3, 1.1, 3.2, platMat)

  // B 围栏矮墙（可越不可穿）
  addBox(ctx, bCx + 8, 0.9, bCz + 6, 10, 1.8, 1, wallDarkMat)
  addBox(ctx, bCx - 2, 0.9, bCz + 10.5, 14, 1.8, 1, wallDarkMat)

  crateStack(ctx, bCx + 6, bCz - 6, crateMat, crateDarkMat)
  crateStack(ctx, bCx - 5, bCz + 1, crateMat, crateDarkMat)
  addBarrel(ctx, bCx + 9, bCz + 2, 0x7a4b2c)
  addBarrel(ctx, bCx + 8.2, bCz + 3.1, 0x516b4a)

  /* ===================== B 洞通道（东侧）===================== */
  // 从 T 半场东侧南下至 B
  addBox(ctx, 48, 2, -8, 1.6, 4, 42, wallDarkMat)  // 内壁（x≈48, z:-29~13）
  addBox(ctx, 54, 2, 20, 14, 4, 1.6, wallMat)      // 出洞折墙
  addArch(ctx, 52.5, -20, 6.5, wallDarkMat)        // 洞口拱
  crateStack(ctx, 52, 2, crateMat, crateDarkMat)
  addBarrel(ctx, 49.6, -3, 0x4b5a68)

  // CT → B 连接（南侧缺口走廊壁）
  addBox(ctx, 22, 2, 40, 1.6, 4, 22, wallDarkMat)

  /* ===================== 半场掩体 ===================== */
  // CT 半场
  addBox(ctx, -8, 1, 46, 14, 2, 3, crateMat)
  addBox(ctx, 14, 1, 50, 4, 2, 4, crateDarkMat)
  addBarrel(ctx, 20, 44, 0x7a4b2c)
  // T 半场
  addBox(ctx, 8, 1, -46, 14, 2, 3, crateMat)
  addBox(ctx, -14, 1, -50, 4, 2, 4, crateDarkMat)
  addBarrel(ctx, -20, -44, 0x516b4a)

  // 场地四角装饰塔楼（视觉层次）
  for (const [tx, tz] of [[-56, -56], [56, -56], [-56, 56], [56, 56]]) {
    addBox(ctx, tx, 3, tz, 6, 8, 6, wallDarkMat)
    addBox(ctx, tx, 7.4, tz, 7, 0.8, 7, wallMat)
  }

  const ctSpawns: SpawnPoint[] = [
    spawn(-6, 52, Math.PI),
    spawn(0, 54, Math.PI),
    spawn(6, 52, Math.PI),
    spawn(-10, 48, Math.PI),
    spawn(10, 48, Math.PI),
  ]

  const tSpawns: SpawnPoint[] = [
    spawn(-6, -52, 0),
    spawn(0, -54, 0),
    spawn(6, -52, 0),
    spawn(-10, -48, 0),
    spawn(10, -48, 0),
  ]

  const bombSites = [
    { id: 'A' as const, position: { x: aCx, y: 0, z: aCz }, radius: 10 },
    { id: 'B' as const, position: { x: bCx, y: 0, z: bCz }, radius: 10 },
  ]

  return { group: map, colliders: ctx.colliders, ctSpawns, tSpawns, bombSites }
}
