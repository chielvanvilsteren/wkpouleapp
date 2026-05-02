const mockDispose = jest.fn()

// Create a real DOM canvas element so appendChild works
function makeMockCanvas() {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas')
  }
  return { style: {} }
}

export const WebGLRenderer = jest.fn().mockImplementation(() => ({
  setSize: jest.fn(),
  setPixelRatio: jest.fn(),
  render: jest.fn(),
  dispose: mockDispose,
  domElement: makeMockCanvas(),
  setClearColor: jest.fn(),
}))

export const Scene = jest.fn().mockImplementation(() => ({
  add: jest.fn(),
  background: null,
}))

export const PerspectiveCamera = jest.fn().mockImplementation(() => ({
  position: { set: jest.fn(), z: 0 },
  aspect: 1,
  updateProjectionMatrix: jest.fn(),
  lookAt: jest.fn(),
}))

export const PlaneGeometry = jest.fn().mockImplementation(() => ({
  attributes: {
    position: {
      array: new Float32Array(300 * 3),
      needsUpdate: false,
      setZ: jest.fn(),
    },
  },
  dispose: mockDispose,
  computeVertexNormals: jest.fn(),
}))

export const MeshLambertMaterial = jest.fn().mockImplementation(() => ({
  map: null,
  dispose: mockDispose,
  side: 0,
  needsUpdate: false,
}))

export const MeshBasicMaterial = jest.fn().mockImplementation(() => ({
  map: null,
  dispose: mockDispose,
  side: 0,
}))

export const Mesh = jest.fn().mockImplementation(() => ({
  rotation: { y: 0 },
}))

export const TextureLoader = jest.fn().mockImplementation(() => ({
  load: jest.fn((url: string, onLoad?: (t: unknown) => void) => {
    const texture = { needsUpdate: false, dispose: mockDispose, magFilter: 0, minFilter: 0 }
    if (onLoad) onLoad(texture)
    return texture
  }),
}))

export const CanvasTexture = jest.fn().mockImplementation(() => ({
  needsUpdate: false,
  dispose: mockDispose,
}))

export const DirectionalLight = jest.fn().mockImplementation(() => ({
  position: { set: jest.fn() },
}))

export const AmbientLight = jest.fn().mockImplementation(() => ({}))

export const Vector3 = jest.fn().mockImplementation(() => ({}))

export const BufferAttribute = jest.fn().mockImplementation(() => ({
  setZ: jest.fn(),
  needsUpdate: false,
}))

export const DoubleSide = 2
export const LinearFilter = 1006
export const Color = jest.fn().mockImplementation(() => ({}))
