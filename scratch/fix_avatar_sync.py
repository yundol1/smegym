import os

path = r"c:\Users\SukBean_YUN\Dev\smegym\src\app\page.tsx"
with open(path, "r", encoding='utf-8') as f:
    text = f.read()

# Block 1: Feed Input
target1 = '''<div style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                               {currentUser.아바타 && currentUser.아바타.startsWith('http') ? <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                            </div>'''

repl1 = '''<div style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                               {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                                 <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                                 <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                            </div>'''

# Block 2: Modal Input
target2 = '''<div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                       {currentUser.아바타 && currentUser.아바타.startsWith('http') ? <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                    </div>'''

repl2 = '''<div style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", background: "var(--secondary)", overflow: "hidden", flexShrink: 0 }}>
                       {currentUser.아바타 && currentUser.아바타.startsWith('http') ? 
                         <img src={currentUser.아바타} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${currentUser.아바타줌 || 1})` }} /> : 
                         <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "white" }}>{currentUser.아바타}</div>}
                    </div>'''

# Try exact match first
if target1 in text:
    text = text.replace(target1, repl1)
else:
    print("Warning: Target1 not found")

if target2 in text:
    text = text.replace(target2, repl2)
else:
    print("Warning: Target2 not found")

with open(path, "w", encoding='utf-8') as f:
    f.write(text)
