"""Render each completed weapon with identical studio lighting, using GPU when available."""
import bpy, os, shutil
from mathutils import Vector
ROOT='D:/Github/Guns';OUT=ROOT+'/assets/reviews';os.makedirs(OUT,exist_ok=True)
scene=bpy.context.scene
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='OPTIX';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='OPTIX'
    scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.cycles.samples=96;scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
collection=bpy.data.collections.get('ARSENAL — game assets')
for index,kind in enumerate(['ak47','glock','kar98k','shotgun','ar15','revolver','1911']):
    if os.environ.get('RENDER_ONLY') and os.environ['RENDER_ONLY']!=kind:continue
    selected=[]
    for o in collection.objects:
        active=o.get('weapon')==kind and not o.name.startswith(('optic_','muzzle_','under_'))
        o.hide_render=not active
        if active:o.location.z-=index*1.2;selected.append(o)
    pistol=kind in ['glock','1911','revolver']
    camera=scene.camera
    camera.location=(.65,-3.9,1.05) if not pistol else (.40,-3.9,1.15)
    target=Vector((-.025,0,-.055 if not pistol else -.025))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=2.65 if not pistol else 1.35 if kind=='revolver' else 1.16
    floor=bpy.data.objects.get('Arsenal Studio Floor')
    if floor:floor.location.z=-.59 if not pistol else -.35
    scene.render.filepath=OUT+'/'+kind+'.png'
    bpy.ops.render.render(write_still=True)
    for o in selected:o.location.z+=index*1.2
    print('REVIEW RENDER COMPLETE '+kind,flush=True)
shutil.copyfile(OUT+'/ak47.png',ROOT+'/assets/AK47-realistic.png')
