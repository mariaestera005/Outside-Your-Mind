import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

// Fundalul animat din repo-ul ShaderGradient, cu culorile din paleta aleasă.
function Background() {
  return (
    <div className="background">
      <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }}>
        <ShaderGradient
          type="plane"       // forma: plane | sphere | waterPlane
          animate="on"       // animația pornită
          uSpeed={0.25}      // viteza (mic = liniștitor)
          uStrength={2.4}    // cât de mult se unduiește
          uDensity={1.4}
          uFrequency={5.5}
          uAmplitude={2}
          color1="#FFABAB"   // roz
          color2="#FFD5A1"   // piersică
          color3="#8FD6EE"   // albastru
          rotationX={50}
          rotationZ={-60}
          cDistance={3.6}
          lightType="3d"
          brightness={1.15}
          grain="off"
        />
      </ShaderGradientCanvas>
    </div>
  )
}

export default Background
