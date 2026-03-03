import { useState } from "react"

const PASSCODE = import.meta.env.VITE_APP_PASSCODE || "ewp2024"

export default function Auth({ onAuth }) {
  const [val, setVal] = useState("")
  const [err, setErr] = useState(false)

  const attempt = () => {
    if (val === PASSCODE) { sessionStorage.setItem("ewp_auth", "1"); onAuth() }
    else { setErr(true); setVal("") }
  }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#FDFAF5", fontFamily:"'DM Sans',sans-serif"
    }}>
      <div style={{
        background:"#fff", border:"1px solid #EDE8DF", borderRadius:12, padding:"48px 40px",
        width:340, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", textAlign:"center"
      }}>
        <div style={{
          width:64, height:64, borderRadius:"50%", border:"2px solid #2D2D2D",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 20px", fontSize:22, fontFamily:"Georgia,serif", fontWeight:700, color:"#2D2D2D"
        }}>E</div>
        <div style={{fontSize:20, fontWeight:700, color:"#2D2D2D", marginBottom:4}}>
          Engstrom Wood Products
        </div>
        <div style={{fontSize:12, color:"#9E9E9E", marginBottom:32, letterSpacing:"0.08em", textTransform:"uppercase"}}>
          Estimate Manager
        </div>
        <input
          type="password"
          placeholder="Enter team passcode"
          value={val}
          onChange={e => { setVal(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{
            width:"100%", padding:"10px 14px", borderRadius:7, border:`1px solid ${err?"#c0392b":"#C9A96E"}`,
            fontSize:14, outline:"none", background:"#FDFAF5", color:"#2D2D2D",
            boxSizing:"border-box", marginBottom:8
          }}
          autoFocus
        />
        {err && <div style={{color:"#c0392b", fontSize:12, marginBottom:8}}>Incorrect passcode</div>}
        <button
          onClick={attempt}
          style={{
            width:"100%", padding:"10px 0", borderRadius:7, border:"none",
            background:"#2D2D2D", color:"#FDFAF5", fontWeight:600, fontSize:14,
            cursor:"pointer", marginTop:4
          }}
        >
          Sign In
        </button>
        <div style={{fontSize:11, color:"#C9A96E", marginTop:20}}>
          Contact your administrator for the passcode
        </div>
      </div>
    </div>
  )
}