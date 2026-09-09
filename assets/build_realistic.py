"""High-detail exterior asset pass, with shared 2K PBR materials and studio render."""
import bpy, math, os, json, shutil
from mathutils import Vector
ROOT='D:/Github/Guns'
source=open(ROOT+'/assets/build_arsenal.py',encoding='utf-8').read()
exec(compile(source.split('manifest=[]')[0],'arsenal_base','exec'))
OUT=ROOT+'/assets/export/models';os.makedirs(OUT,exist_ok=True)
for name,m in materials.items():
    if name=='glass':
        bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=.1;bs.inputs['Roughness'].default_value=.08;bs.inputs['Transmission Weight'].default_value=.7;continue
    nodes=m.node_tree.nodes;links=m.node_tree.links;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');bs=nodes.new('ShaderNodeBsdfPrincipled');links.new(bs.outputs['BSDF'],out.inputs['Surface'])
    bs.inputs['Metallic'].default_value=1 if name in ['steel','edge','silver'] else 0
    if name=='wood':bs.inputs['Coat Weight'].default_value=.14;bs.inputs['Coat Roughness'].default_value=.30
    if name=='silver':
        anis=bs.inputs.get('Anisotropic') or bs.inputs.get('Anisotropic IOR Level')
        if anis:anis.default_value=.32
    for channel,ext in [('base','jpg'),('rough','jpg'),('normal','png')]:
        tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(ROOT+'/assets/textures/'+name+'_'+channel+'.'+ext,check_existing=False);tex.image.pack();tex.label=name+' '+channel+' 2048px'
        if channel=='base':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        elif channel=='rough':tex.image.colorspace_settings.name='Non-Color';links.new(tex.outputs['Color'],bs.inputs['Roughness'])
        else:
            tex.image.colorspace_settings.name='Non-Color';normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45 if name in ['black','rubber'] else .24;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
original_finish=finish
def finish(o,name,mat,bevel=0):
    o=original_finish(o,name,mat,bevel)
    for mod in o.modifiers:
        if mod.type=='BEVEL':mod.segments=5;mod.width=min(mod.width,min(o.dimensions)*.18) if min(o.dimensions)>0 else mod.width
    return o
original_cyl=cyl
def cyl(name,loc,r,length,mat='steel',axis='X',vertices=96):return original_cyl(name,loc,r,length,mat,axis,max(vertices,48))
def remove(o):
    if o in parts:parts.remove(o)
    bpy.data.objects.remove(o,do_unlink=True)
def cut(obj,cutter):
    mod=obj.modifiers.new('Machined exterior recess','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name);remove(cutter)
def rounded_line(name,pts,r=.008,mat='steel',cyclic=False):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=16;curve.bevel_depth=r;curve.bevel_resolution=5
    sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    sp.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,curve);collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return finish(o,name,mat)
def ring(name,loc,outer,inner,length,mat='steel',axis='X',n=96):
    verts=[]
    for end,r in [(-length/2,outer),(length/2,outer),(-length/2,inner),(length/2,inner)]:
        for i in range(n):
            a=i*math.tau/n;v=(end,math.cos(a)*r,math.sin(a)*r)
            if axis=='Y':v=(v[1],v[0],v[2])
            verts.append(tuple(loc[j]+v[j] for j in range(3)))
    faces=[]
    for a,b in [(0,1),(3,2),(2,0),(1,3)]:
        for i in range(n):faces.append((a*n+i,a*n+(i+1)%n,b*n+(i+1)%n,b*n+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collection.objects.link(o);finish(o,name,mat,.0008)
    for p in mesh.polygons:p.use_smooth=True
    return o
def loft(name,sections,mat='wood',n=64,power=3):
    # Cross-section loft with smooth shoulders, rather than flat extruded furniture.
    verts=[]
    for x,zc,ry,rz in sections:
        for j in range(n):
            a=j*math.tau/n;c,s=math.cos(a),math.sin(a)
            verts.append((x,math.copysign(abs(c)**(2/power),c)*ry,zc+math.copysign(abs(s)**(2/power),s)*rz))
    faces=[tuple(range(n-1,-1,-1)),tuple(range((len(sections)-1)*n,len(sections)*n))]
    for i in range(len(sections)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collection.objects.link(o);finish(o,name,mat)
    sub=o.modifiers.new('Furniture curvature','SUBSURF');sub.levels=2;sub.render_levels=2
    for p in mesh.polygons:p.use_smooth=True
    return o
def screw(name,x,y,z,r=.013):
    o=cyl(name,(x,y,z),r,.008,'edge','Y',48)
    c=box('cut screw slot',(x,y,z),(.003,.02,r*1.25),'black',0);cut(o,c)
    return o
def engraving(text,loc,size=.014,mat='edge'):
    curve=bpy.data.curves.new('Stamp '+text,'FONT');curve.body=text;curve.size=size;curve.extrude=.00012;curve.resolution_u=8
    o=bpy.data.objects.new('Stamp '+text,curve);collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);finish(o,'Stamp '+text,mat)
def high_guard(x,z,s=1):
    rounded_line('Forged trigger guard',[(x-.095*s,0,z),(x-.108*s,0,z-.074*s),(x-.072*s,0,z-.102*s),(x+.060*s,0,z-.102*s),(x+.097*s,0,z-.073*s),(x+.105*s,0,z)],.009*s)
    rounded_line('Curved trigger',[(x-.010*s,0,z),(x+.011*s,0,z-.041*s),(x-.009*s,0,z-.074*s)],.010*s)
def high_ak():
    global parts
    parts=[]
    loft('Walnut buttstock',[(-1.12,-.073,.054,.153),(-1.115,-.073,.067,.165),(-1.08,-.065,.074,.168),(-.95,-.047,.072,.147),(-.72,.011,.064,.109),(-.60,.057,.053,.073),(-.52,.078,.044,.044),(-.46,.093,.047,.047),(-.41,.096,.046,.050)],'wood',power=3.2)
    loft('Steel butt cap',[(-1.133,-.073,.061,.157),(-1.125,-.073,.069,.168),(-1.114,-.073,.069,.168)],'steel',power=3.4)
    box('Stock tang',(-.48,0,.141),(.16,.036,.010),'steel',.003)
    receiver=poly('Milled receiver',[(-.43,.202),(.17,.202),(.20,.16),(.18,-.012),(-.05,-.042),(-.40,-.035),(-.43,.012)],.145,'steel',.008)
    for side in [-1,1]:
        pocket=box('Receiver lightening pocket',(-.095,side*.075,.071),(.37,.027,.084),'steel',.015);cut(receiver,pocket)
        for px,pz in [(-.355,.02),(-.225,.12),(.107,.069)]:screw('Receiver pin',px,side*.077,pz,.010)
    loft('Formed dust cover',[(-.432,.174,.065,.037),(-.423,.180,.070,.065),(-.39,.180,.070,.069),(.075,.180,.067,.067),(.105,.180,.064,.062),(.128,.180,.058,.047)],'steel',power=2.3)
    for side in [-1,1]:rounded_line('Cover rolled lower lip',[(-.42,side*.07,.157),(-.10,side*.07,.157),(.12,side*.063,.157)],.004,'edge')
    box('Cover release button',(-.447,0,.215),(.047,.043,.031),'edge',.006)
    poly('Walnut pistol grip',[(-.324,-.030),(-.191,-.028),(-.198,-.09),(-.22,-.16),(-.232,-.30),(-.243,-.34),(-.267,-.35),(-.382,-.32),(-.383,-.282),(-.344,-.09)],.10,'wood',.025)
    screw('Grip screw',-.300,-.053,-.285,.013)
    high_guard(-.1,-.035)
    box('Magazine latch',(.026,0,-.045),(.055,.056,.025),'steel',.003)
    rounded_line('Magazine latch lever',[(.022,0,-.044),(.036,0,-.095),(.069,0,-.108)],.012,'steel')
    # A curved stamped shell with a continuous profile and formed side ribs.
    n=40;verts=[]
    for i in range(n+1):
        t=i/n;x=.066+.205*t*t;z=-.035-.48*t;width=.150-.014*t
        for yy,xx in [(-.052,-width/2),(-.052,width/2),(.052,width/2),(.052,-width/2)]:verts.append((x+xx,yy,z))
    faces=[(3,2,1,0),tuple(range(n*4,n*4+4))]
    for i in range(n):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    mesh=bpy.data.meshes.new('Curved magazine shell');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Curved magazine shell',mesh);collection.objects.link(o);finish(o,'Curved magazine shell','steel',.006)
    for side in [-1,1]:
        for rib in [-.047,0,.047]:rounded_line('Pressed magazine reinforcing rib',[(.066+.205*t*t+rib,side*.054,-.060-.43*t) for t in [i/20 for i in range(21)]],.0065,'steel')
        rounded_line('Magazine seam',[(.145+.205*t*t,side*.047,-.037-.473*t) for t in [i/20 for i in range(21)]],.003,'edge')
    o=box('Magazine floorplate',(.27,0,-.521),(.16,.117,.017),'edge',.006);o.rotation_euler[1]=-.10
    cyl('Barrel',(.662,0,.148),.024,.89);ring('Muzzle crown',(1.112,0,.148),.031,.017,.035)
    cyl('Muzzle darkness',(1.085,0,.148),.016,.003,'rubber')
    loft('Lower walnut handguard',[(.205,.043,.052,.051),(.217,.044,.074,.068),(.28,.044,.081,.072),(.46,.051,.079,.069),(.565,.062,.067,.057),(.58,.062,.060,.050)],'wood',power=3)
    loft('Upper walnut gas cover',[(.235,.212,.043,.030),(.25,.212,.057,.040),(.29,.212,.061,.043),(.43,.212,.060,.042),(.46,.212,.048,.035)],'wood',power=2.4)
    loft('Handguard front retainer',[(.574,.061,.065,.054),(.580,.061,.068,.057),(.592,.061,.068,.057),(.598,.061,.063,.052)],'steel',power=3)
    cyl('Gas tube',(.527,0,.226),.024,.20)
    poly('Slanted gas block',[(.592,.149),(.665,.149),(.656,.262),(.613,.262),(.578,.209)],.061,'steel',.006)
    cyl('Gas block collar',(.651,0,.149),.039,.086)
    cyl('Cleaning rod',(.788,0,.068),.009,.54)
    cyl('Cleaning rod collar',(1.043,0,.068),.014,.037)
    cyl('Front sight barrel collar',(.973,0,.149),.038,.067)
    poly('Front sight base',[(.948,.158),(.998,.158),(.996,.247),(.985,.271),(.960,.271)],.058,'steel',.003)
    ring('Front sight protector',(.978,0,.286),.043,.032,.037)
    box('Front sight post',(.978,0,.272),(.010,.011,.047),'edge',.001)
    box('Rear sight block',(.15,0,.223),(.147,.074,.075),'steel',.009)
    poly('Rear tangent sight leaf',[(.096,.295),(.262,.272),(.266,.282),(.097,.307)],.042,'edge',.002)
    for i in range(8):box('Tangent sight graduation',(.112+i*.017,-.028,.302-i*.0028),(.004,.012,.002),'silver',.0003)
    box('Rear sight slider',(.159,0,.299),(.024,.085,.023),'steel',.004)
    for y in [-.024,.024]:box('Rear sight notch wall',(.101,y,.318),(.024,.017,.034),'steel',.002)
    rounded_line('Selector lever',[(-.301,-.082,.141),(-.191,-.085,.101),(.067,-.085,.037)],.010,'steel')
    box('Selector paddle',(.063,-.089,.036),(.048,.012,.022),'edge',.004)
    cyl('Selector pivot',(-.30,-.081,.14),.023,.011,'steel','Y')
    box('Bolt handle stem',(.019,-.115,.177),(.092,.072,.023),'steel',.007)
    cyl('Bolt handle knob',(.035,-.155,.178),.016,.047,'edge')
    engraving('AK 47',(-.36,-.083,.165),.023);engraving('1955',(-.344,-.083,.110),.012)
    rounded_line('Rear sling loop',[(-.985,.079,-.09),(-.998,.106,-.09),(-.998,.11,-.04),(-.98,.079,-.04)],.006,'steel',True)
    rounded_line('Front sling loop',[(.585,.06,.058),(.585,.108,.059),(.585,.108,.015),(.585,.06,.015)],.006,'steel',True)
    for o in parts:
        if o.name.startswith(('Rear tangent','Tangent sight','Rear sight slider','Rear sight notch')):o.location.z-=.026
    accessories(1.13,.30,.36)
    for o in parts:
        if o.name.startswith('muzzle_'):o.location.z+=.028
    return parts
def enhance(kind,objects):
    # True recesses and shaped parts carry the detail, not only subdivision counts.
    for o in list(objects):
        name=o.name
        if name.startswith(('Trigger guard','Trigger')):remove(o)
    gx,gz,gs={'glock':(-.026,.023,.7),'1911':(-.026,.023,.7),'revolver':(-.04,.002,.85),'shotgun':(-.20,-.02,1),'kar98k':(-.34,-.08,1),'ar15':(-.13,-.02,1)}[kind]
    high_guard(gx,gz,gs)
    if kind in ['glock','1911']:
        slide=next(o for o in parts if o.name.startswith('Slide') and not o.name.startswith('Slide '))
        for o in list(parts):
            if o.name.startswith(('Slide serration','Ejection port','Grip stipple')):remove(o)
        for side in [-1,1]:
            for i in range(9):
                c=box('Slide serration cutter',(-.216+i*.010,side*.044,.160),(.0045,.013,.077),'black',.001);c.rotation_euler[1]=-.13;cut(slide,c)
        c=box('Ejection recess cutter',(.059,-.035,.204),(.102,.064,.068),'black',.008);cut(slide,c)
        box('Barrel hood visible in port',(.052,-.006,.175),(.087,.054,.023),'silver',.004)
        if kind=='1911':
            for px,pz in [(-.178,-.035),(-.245,-.217)]:
                for side in [-1,1]:screw('Grip fastener',px,side*.050,pz,.009)
        engraving('GLOCK  17' if kind=='glock' else 'COLT  AUTOMATIC',(-.17,-.047,.166),.018)
        engraving('AUSTRIA' if kind=='glock' else 'GOVERNMENT MODEL',(-.12,-.047,.138),.008)
        if kind=='glock':
            for o in list(parts):
                if o.name.startswith('Receiver pin'):remove(o)
                elif o.name.startswith('Grip panels'):o.scale.y=.89
            for side in [-1,1]:
                for i in range(16):
                    for j in range(17):
                        x=-.273+i*.007+j*.0035;z=-.236+j*.012
                        box('Molded grip checkering',(x,side*.044,z),(.004,.0015,.006),'black',.0005)
            for i in range(3):rounded_line('Grip finger groove',[(-.157+i*.017,-.029,-.205+i*.069),(-.145+i*.017,0,-.208+i*.069),(-.157+i*.017,.029,-.205+i*.069)],.006,'black')
        else:
            for o in list(parts):
                if o.name.startswith('Hammer'):remove(o)
            ring('Skeleton hammer',(-.265,0,.193),.030,.013,.030,'steel','Y')
            for side in [-1,1]:
                for i in range(18):rounded_line('Diamond checkering',[( -.276+i*.006,side*.050,-.221),(-.220+i*.006,side*.050,-.083)],.0015,'wood')
            rounded_line('Beavertail grip safety',[(-.22,0,.045),(-.28,0,.058),(-.30,0,.091)],.018,'silver')
        ring('Detailed muzzle crown',(.288,0,.163),.023,.015,.012,'silver' if kind=='1911' else 'steel')
        edge=slide.modifiers.new('Slide precision edge breaks','BEVEL');edge.width=.0035 if kind=='glock' else .007;edge.segments=5
        slide.modifiers.new('Slide weighted normals','WEIGHTED_NORMAL')
    if kind=='ar15':
        for o in list(parts):
            if o.name.startswith('Ejection port'):remove(o)
        box('Continuous rail spine',(.11,0,.239),(1.09,.078,.037),'steel',.004)
        handguard=next(o for o in parts if o.name.startswith('Free float'))
        for o in list(parts):
            if o.name.startswith('MLOK slot'):remove(o)
        for side in [-1,1]:
            for i in range(7):cut(handguard,box('MLOK through cutter',(.17+i*.069,side*.085,.13),(.048,.05,.03),'black',.006))
        upper=next(o for o in parts if o.name.startswith('Upper receiver'))
        cut(upper,box('Ejection cutter',(-.08,-.075,.18),(.19,.035,.063),'black',.007))
        cyl('Bolt carrier exposed',(-.08,-.04,.18),.027,.17,'silver')
        for side in [-1,1]:
            for x,z in [(-.35,.05),(.03,.02)]:screw('Takedown pin',x,side*.078,z,.014)
        cyl('Forward assist',(-.30,.102,.182),.024,.067,'black','Y')
        box('Charging handle rear',(-.435,0,.247),(.038,.17,.026),'steel',.006)
        stock=next(o for o in parts if o.name.startswith('Adjustable stock'))
        cut(stock,poly('Stock triangular opening',[(-.85,.08),(-.62,.08),(-.82,-.065)],.19,'black',.014))
        box('Stock shoulder junction',(-.965,0,.023),(.048,.128,.326),'black',.012)
        for o in list(parts):
            if o.name.startswith(('Rear sight','Front sight')):remove(o)
        for x in [-.37,.63]:
            box('Folding sight foot',(x,0,.282),(.07,.065,.025),'black',.004)
            ring('Folding sight aperture',(x,0,.326),.031,.020,.019,'steel')
        engraving('AR-15',(-.38,-.078,.080),.022);engraving('SAFE   FIRE',(-.38,-.079,.017),.009)
        for i in range(13):box('Stock rubber rib',(-1.012,0,-.12+i*.025),(.015,.12,.006),'rubber',.002)
    if kind=='shotgun':
        for o in list(parts):
            if o.name.startswith(('Shoulder stock','Butt plate')):remove(o)
        loft('Sculpted shotgun stock',[(-1.10,-.065,.065,.16),(-1.08,-.060,.074,.17),(-.98,-.03,.07,.145),(-.70,.033,.061,.105),(-.53,.03,.045,.087),(-.43,.069,.039,.051),(-.315,.105,.055,.064)],'wood',power=3)
        loft('Rubber recoil pad',[(-1.12,-.065,.060,.15),(-1.105,-.065,.071,.166),(-1.09,-.065,.072,.167)],'rubber',power=3)
        for i in range(15):box('Recoil pad ribs',(-1.12,0,-.19+i*.019),(.006,.108,.004),'rubber',.001)
        receiver=next(o for o in parts if o.name.startswith('Receiver'))
        for o in list(parts):
            if o.name.startswith('Ejection port'):remove(o)
        cut(receiver,box('Ejection recess',(-.015,-.075,.135),(.21,.035,.082),'black',.009))
        box('Exposed bolt',(-.015,-.06,.13),(.18,.025,.055),'silver',.006)
        engraving('REMINGTON',(-.29,-.078,.090),.014);engraving('870',(-.24,-.078,.057),.012)
        ring('Shotgun muzzle lip',(1.096,0,.12),.044,.033,.017)
    if kind=='kar98k':
        for o in list(parts):
            if o.name.startswith(('Full walnut stock','Stock barrel band','Rear tangent sight','Front sight')):remove(o)
            elif o.name.startswith(('Floor plate','Forged trigger guard','Curved trigger')):o.location.z+=.032
            elif o.name.startswith('Bolt knob'):
                for p in o.data.polygons:p.use_smooth=True
                sub=o.modifiers.new('Polished round bolt knob','SUBSURF');sub.levels=2;sub.render_levels=2
        loft('Contoured walnut full stock',[(-1.17,-.073,.055,.175),(-1.15,-.067,.069,.177),(-1.06,-.045,.071,.15),(-.82,.003,.064,.098),(-.65,.016,.049,.076),(-.54,-.011,.042,.087),(-.44,.025,.047,.080),(-.32,.028,.067,.075),(-.06,.018,.067,.070),(.32,.015,.057,.057),(.64,.017,.049,.048),(.70,.017,.044,.043)],'wood',power=2.8)
        for x in [.36,.65]:
            ring('Stock steel band',(x,0,.024),.067,.052,.024)
        for x in [-.59,-.39]:screw('Stock cross bolt',x,-.058,.002,.016)
        ring('Bolt shroud',(-.49,0,.175),.046,.025,.038)
        poly('Tangent sight base',[(-.06,.121),(.17,.121),(.14,.22),(-.034,.22)],.051,'steel',.005)
        box('Tangent sight leaf',(.052,0,.225),(.215,.044,.021),'edge',.003)
        ring('Front sight hood',(.971,0,.18),.027,.020,.037)
        box('Front sight blade',(.971,0,.173),(.009,.008,.027),'edge',.001)
        box('Floorplate bedding',(-.25,0,-.041),(.32,.105,.042),'steel',.007)
        engraving('Mod. 98',(-.42,-.069,.144),.018)
        for i in range(10):box('Rear sight calibration',(-.024+i*.018,-.029,.239),(.003,.012,.002),'silver',.0004)
    if kind=='revolver':
        for side in [-1,1]:
            for x,z in [(-.20,.11),(-.22,.03),(-.29,-.20)]:screw('Sideplate screw',x,side*.057,z,.010)
        engraving('SMITH & WESSON',(.14,-.043,.112),.012)
        cyl('Ejector rod',(.19,-.04,.053),.012,.22,'silver')
        for i in range(9):box('Hammer checkering',(-.255+i*.004,0,.238),(.002,.027,.003),'edge',.0003)
    return parts
def uv_project(o):
    # Per-face projection keeps consistent material density across curved and planar pieces.
    mesh=o.data
    if not mesh.uv_layers:mesh.uv_layers.new(name='SurfaceUV')
    uv=mesh.uv_layers.active.data
    for p in mesh.polygons:
        axis=max(range(3),key=lambda j:abs(p.normal[j]))
        for li in p.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            if axis==0:a,b=v.y,v.z
            elif axis==1:a,b=v.x,v.z
            else:a,b=v.x,v.y
            uv[li].uv=(a*1.4+.5,b*1.4+.5)
manifest=[]
for i,kind in enumerate(['ak47','glock','kar98k','shotgun','ar15','revolver','1911']):
    bpy.ops.object.select_all(action='DESELECT')
    objects=high_ak() if kind=='ak47' else enhance(kind,build(kind))
    if kind in ['glock','1911','revolver']:
        sx,sz=(1.20,.86) if kind!='revolver' else (1.12,.93)
        for o in objects:
            bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
            o.location.x*=sx;o.location.z*=sz
            for v in o.data.vertices:v.co.x*=sx;v.co.z*=sz
    for o in objects:
        o['weapon']=kind;o['quality']='Detailed exterior / 2K PBR';uv_project(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=OUT+'/'+kind+'.glb',export_format='GLB',use_selection=True,export_apply=True,export_image_format='AUTO')
    deps=bpy.context.evaluated_depsgraph_get();tris=sum(len(o.evaluated_get(deps).data.polygons) for o in objects)
    manifest.append({'id':kind,'objects':len(objects),'evaluated_faces':tris,'file':kind+'.glb','pbr':'2048px baseColor / roughness / tangent normal'})
    for o in objects:
        o.location.z+=i*1.2
        if o.name.startswith(('optic_','muzzle_','under_')):o.hide_render=True;o.hide_set(True)
    print('FINISHED '+kind+' '+str(len(objects))+' parts, '+str(tris)+' faces')
with open(OUT+'/manifest.json','w') as f:json.dump(manifest,f,indent=2)
for o in list(bpy.context.scene.objects):
    if o.name in ['Cube','Light','Camera']:o.hide_render=True;o.hide_set(True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=128;scene.cycles.use_denoising=True
scene.view_settings.view_transform='AgX'
scene.render.resolution_x=2200;scene.render.resolution_y=1300;scene.render.resolution_percentage=100
world=scene.world;world.use_nodes=True
envnode=next((n for n in world.node_tree.nodes if n.type=='TEX_ENVIRONMENT'),None)
if envnode and envnode.image:
    dest=ROOT+'/assets/export/studio.hdr'
    env_path=bpy.path.abspath(envnode.image.filepath)
    if os.path.isfile(env_path) and os.path.abspath(env_path)!=os.path.abspath(dest):shutil.copyfile(env_path,dest)
    elif os.path.isfile(dest):envnode.image=bpy.data.images.load(dest,check_existing=True)
    envnode.image.pack()
bg=next((n for n in world.node_tree.nodes if n.type=='BACKGROUND'),None)
if bg:bg.inputs['Strength'].default_value=.32
for name,location,target,power,size in [('Arsenal Key',(.2,-2.4,3.8),(0,0,0),230,4),('Arsenal Rim',(.4,1.8,2),(.1,0,.1),300,3),('Arsenal Fill',(-2,-1,1),(0,0,0),70,2)]:
    bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='RECTANGLE';o.data.size=size;o.data.size_y=size*.38;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.3,-3.9,1.40));cam=bpy.context.object;cam.name='Arsenal Hero Camera';cam.rotation_euler=(Vector((0,0,-.04))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.9;scene.camera=cam
for o in collection.objects:
    if o.get('weapon')!='ak47':o.hide_render=True
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.61));floor=bpy.context.object;floor.name='Arsenal Studio Floor';floor.data.materials.append(materials['rubber'])
scene.render.filepath=ROOT+'/assets/AK47-realistic.png'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/Arsenal-Realistic.blend')
print(json.dumps(manifest))
