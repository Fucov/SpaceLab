import type { LabModule } from '../../types'

export type RunState = 'running' | 'waiting' | 'error' | 'completed' | 'idle'

export const accentByType: Record<LabModule['moduleType'], string> = {
  life_science: '#2fb7a5',
  fluid_physics: '#2f9fca',
  material: '#c58a2b',
  combustion: '#c65a3a',
  earth_observe: '#4caa65',
  bio: '#8765c7',
}

export function activeColor(runState: RunState, accent = '#54d3bd') {
  if (runState === 'error') return '#ef6666'
  if (runState === 'waiting') return '#eabf5a'
  if (runState === 'completed') return '#64c97a'
  if (runState === 'running') return '#54d3bd'
  return accent
}

export const glassMaterial = {
  color: '#cdeefa',
  roughness: 0.04,
  metalness: 0,
  transmission: 0.68,
  thickness: 0.34,
  envMapIntensity: 1.45,
  clearcoat: 0.9,
  clearcoatRoughness: 0.08,
  transparent: true,
  opacity: 0.28,
}

export const metalMaterial = {
  color: '#8d98a6',
  metalness: 0.78,
  roughness: 0.34,
  envMapIntensity: 1.2,
}

export const darkMetalMaterial = {
  color: '#2f3b4a',
  metalness: 0.62,
  roughness: 0.38,
  envMapIntensity: 1.1,
}

export const plasticMaterial = {
  color: '#5d6b7d',
  metalness: 0.04,
  roughness: 0.58,
  envMapIntensity: 0.9,
}

export const whitePlasticMaterial = {
  color: '#d7dde3',
  metalness: 0.03,
  roughness: 0.5,
  envMapIntensity: 0.95,
}

export const liquidBlueMaterial = {
  color: '#61d5e9',
  roughness: 0.03,
  transmission: 0.38,
  thickness: 0.14,
  transparent: true,
  opacity: 0.56,
  envMapIntensity: 1.15,
}

export const liquidAmberMaterial = {
  color: '#f4b45a',
  roughness: 0.04,
  transmission: 0.28,
  thickness: 0.12,
  transparent: true,
  opacity: 0.54,
  envMapIntensity: 1,
}

export const agarMaterial = {
  color: '#b8efe1',
  roughness: 0.09,
  transmission: 0.26,
  thickness: 0.08,
  transparent: true,
  opacity: 0.62,
  envMapIntensity: 0.9,
}

export const oledMaterial = {
  color: '#071827',
  roughness: 0.22,
  metalness: 0.02,
  emissive: '#143045',
  emissiveIntensity: 0.22,
}

export const cableMaterial = {
  color: '#263241',
  metalness: 0.12,
  roughness: 0.46,
}

export function statusLightMaterial(runState: RunState, active: boolean, accent = '#54d3bd') {
  const color = active ? activeColor(runState, accent) : '#647284'
  return {
    color,
    emissive: active ? color : '#111827',
    emissiveIntensity: active ? 0.78 : 0.08,
    roughness: 0.25,
  }
}

export function deviceMaterial(color: string, active: boolean, runState: RunState, accent = color) {
  const signal = activeColor(runState, accent)
  return {
    color: active ? signal : color,
    metalness: 0.08,
    roughness: 0.52,
    envMapIntensity: 0.95,
    emissive: active ? signal : '#000000',
    emissiveIntensity: active ? 0.14 : 0,
  }
}
