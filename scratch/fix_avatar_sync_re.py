import os
import re

path = r"c:\Users\SukBean_YUN\Dev\smegym\src\app\page.tsx"
with open(path, "r", encoding='utf-8') as f:
    text = f.read()

# Pattern 1: Feed Input
# Uses 1.8rem
pat1 = r'<div style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: "var\(--secondary\)", overflow: "hidden", flexShrink: 0 }}>\s*{currentUser\.아바타 && currentUser\.아바타\.startsWith\(\'http\'\) \? <img src={currentUser\.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{currentUser\.아바타}</div>}\s*</div>'

repl1 = '''<div style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                               {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                                 <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                                 <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                            </div>'''

# Pattern 2: Modal Input
# Uses 2.2rem
pat2 = r'<div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var\(--secondary\)", overflow: "hidden", flexShrink: 0 }}>\s*{currentUser\.아바타 && currentUser\.아바타\.startsWith\(\'http\'\) \? <img src={currentUser\.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "white" }}>{currentUser\.아바타}</div>}\s*</div>'

repl2 = '''<div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                       {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                         <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                         <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                    </div>'''

text = re.sub(pat1, repl1, text)
text = re.sub(pat2, repl2, text)

with open(path, "w", encoding='utf-8') as f:
    f.write(text)
