"""Deterministic original 2K PBR surface maps, no external texture dependencies."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
OUT=Path(__file__).parent/'textures'; OUT.mkdir(exist_ok=True)
N=2048; rng=np.random.default_rng(8247)
def noise(size):
    a=Image.fromarray(np.uint8(rng.random((size,size))*255)).resize((N,N),Image.Resampling.BICUBIC)
    return np.asarray(a,dtype=np.float32)/255
y,x=np.mgrid[0:N,0:N].astype(np.float32)/N
fine=noise(1024); medium=noise(128); broad=noise(12)
def save(name,base,rough,height,strength):
    Image.fromarray(np.uint8(np.clip(base,0,1)*255)).save(OUT/(name+'_base.jpg'),quality=95)
    Image.fromarray(np.uint8(np.clip(rough,0,1)*255)).save(OUT/(name+'_rough.jpg'),quality=95)
    dy,dx=np.gradient(height); normal=np.stack((-dx*strength,-dy*strength,np.ones_like(x)),axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    Image.fromarray(np.uint8((normal*.5+.5)*255)).save(OUT/(name+'_normal.png'))
streak=np.asarray(Image.fromarray(np.uint8(rng.random((512,8))*255)).resize((N,N),Image.Resampling.BICUBIC),dtype=np.float32)/255
grainphase=y*65+1.2*np.sin(x*4+y*9)+.3*np.sin(x*11+y*24)
grain=(np.sin(grainphase*6.283)*.5+.5)**15
wood=.40+.15*streak+.045*broad-.06*grain
base=np.stack((wood*.82,wood*.42,wood*.18),axis=-1)
save('wood',base,.40+.025*streak+.015*grain,wood,.09)
scratch=Image.new('L',(N,N),0);d=ImageDraw.Draw(scratch)
for i in range(1400):
    a=int(rng.integers(N));b=int(rng.integers(N));length=int(rng.integers(3,150));d.line((a,b,a+length,b+int(rng.integers(-3,4))),fill=int(rng.integers(15,100)),width=1)
s=np.asarray(scratch,dtype=np.float32)/255
for name,col,rough,amp in [('steel',(.26,.29,.32),.34,.009),('edge',(.38,.40,.43),.27,.01),('silver',(.64,.66,.69),.23,.012),('black',(.065,.071,.078),.48,.014),('rubber',(.032,.036,.04),.74,.024)]:
    variance=(medium-.5)*amp+(broad-.5)*amp+fine*.008+s*.12
    base=np.clip(np.array(col)[None,None,:]+variance[...,None],0,1)
    h=fine*(.03 if name in ['black','rubber'] else .001)-s*.012
    save(name,base,rough+(medium-.5)*.012+s*.05,h,1.3 if name in ['black','rubber'] else .5)
print('Created 18 original 2K PBR texture maps.')
