# Three.js vs Unity for Quest VR Performance

## Quick Answer
**Unity Native = Faster** ✅  
**Three.js Web = Slower but more accessible** ⚠️

## Performance Breakdown

### Unity Native (Quest APK)
| Metric | Performance |
|--------|-------------|
| **FPS** | 90-120 FPS (stable) |
| **Triangles** | ~1M visible |
| **Draw Calls** | 200-250 |
| **Memory** | Full Quest RAM (~4-5GB) |
| **Features** | ✅ Full depth API<br>✅ Passthrough MR<br>✅ Hand tracking<br>✅ Native plugins |
| **Latency** | ~11-16ms frame time |

### Three.js + WebXR (Quest Browser)
| Metric | Performance |
|--------|-------------|
| **FPS** | 45-72 FPS (variable) |
| **Triangles** | ~200-400k |
| **Draw Calls** | 50-100 |
| **Memory** | Limited by browser (~1-2GB) |
| **Features** | ⚠️ Limited depth<br>❌ No passthrough<br>⚠️ Basic hand tracking<br>❌ No native plugins |
| **Latency** | ~20-40ms frame time |

## Why Unity is Faster

1. **Native Code**: C# compiled to IL2CPP → native ARM code
2. **Direct GPU Access**: No browser overhead
3. **Optimized Rendering**: Unity's render pipeline optimized for mobile VR
4. **Better Memory Management**: Direct control, no GC pressure from JS
5. **Quest-Specific Optimizations**: Meta XR SDK tuned for Quest hardware

## When to Use Each

### Use Unity Native When:
- ✅ You need best performance
- ✅ You need MR/passthrough
- ✅ You need full Quest features
- ✅ You're building a production app
- ✅ You need offline capability

### Use Three.js Web When:
- ✅ You need instant deployment (no app store)
- ✅ You want cross-platform (web + Quest)
- ✅ You're prototyping quickly
- ✅ You need easy updates (just push code)
- ✅ You're building demos/portfolios

## Real-World Example

**City-scale 3D map (like your Cesium integration):**

| Approach | FPS | Quality | Features |
|----------|-----|---------|----------|
| Unity + Cesium | 90 FPS | High detail | Full MR |
| Three.js + Cesium | 45 FPS | Medium detail | VR only |
| WebXR + Three.js | 60 FPS | Low detail | Basic VR |

## Recommendation for Your Project

**Current Setup (Cesium + Unity Export):**
- ✅ Best of both worlds
- ✅ Web preview (Cesium)
- ✅ Unity export for Quest native
- ✅ Same data, optimized for each platform

**If you want to add Three.js:**
- Use Three.js for web-only features
- Keep Unity export for Quest native
- Three.js won't be faster than Unity, but good for web demos

## Code Comparison

### Unity (C# - Native)
```csharp
// Direct GPU access, optimized
Graphics.DrawMeshInstanced(mesh, 0, material, matrices);
// ~0.1ms for 1000 objects
```

### Three.js (JavaScript - Web)
```javascript
// Browser overhead, JS interpretation
for (let i = 0; i < 1000; i++) {
    renderer.render(scene, camera);
}
// ~2-5ms for 1000 objects
```

## Bottom Line

**Unity = 2-3x faster** for Quest VR  
**Three.js = Better for web deployment**

Your current approach (Cesium web + Unity export) is optimal! 🎯
