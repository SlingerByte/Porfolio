import { Window } from './furniture/Window'
import { Door } from './furniture/Door'
import { Shelf } from './furniture/Shelf'
import { Desk, Chair } from './furniture/Desk'
import { Monitor } from './furniture/Monitor'
import { Rug } from './furniture/Rug'
import { DeskItems } from './furniture/DeskItems'
import { ShelfBooks, PersonalObjects, AiSignature } from './furniture/ShelfItems'
import { Corkboard } from './furniture/Corkboard'
import { BlackCat } from './furniture/Cats'
import { SelectedWorksBook } from './furniture/SelectedWorksBook'
import { PALETTE } from './palette'

/**
 * M3-A structural blockout of the Amber Studio diorama (M0.2 composition).
 * Camera is authority: furniture was placed to fit the existing framing,
 * not the other way around. Visible width at the back wall ≈ 8.4 world units
 * (camera z 7.4 · fov 35), so composition percentages map to:
 *   window x≈-2.9 (~16%) · shelf +0.6..+2.6 (~60-78%) · door x≈+3.1 (~87%)
 * Lower-left stays deliberately empty for the DOM hero.
 */
export function Room() {
  return (
    <group>
      {/* shell */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color={PALETTE.floorWood} roughness={0.9} />
      </mesh>
      <mesh position={[0, 4, -2]} receiveShadow>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial color={PALETTE.wallPlaster} roughness={0.95} />
      </mesh>
      {/* baseboard gives the wall a grounded silhouette line */}
      <mesh position={[0, 0.07, -1.97]}>
        <boxGeometry args={[24, 0.14, 0.05]} />
        <meshStandardMaterial color={PALETTE.baseboard} />
      </mesh>

      <Window />
      <Door />
      <Shelf />
      <Desk />
      <Chair />
      <Monitor />
      <Rug />

      {/* narrative props (M3-D): every object has a reason to exist */}
      <DeskItems />
      <ShelfBooks />
      <PersonalObjects />
      <AiSignature />
      <SelectedWorksBook />
      <Corkboard />

      {/* resident (M3-D.3): black at the window */}
      <BlackCat />
    </group>
  )
}
