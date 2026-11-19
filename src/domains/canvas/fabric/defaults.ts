import { FabricObject } from 'fabric'

// Preserve existing top-left document coordinates after Fabric 7's origin change.
FabricObject.ownDefaults.originX = 'left'
FabricObject.ownDefaults.originY = 'top'
