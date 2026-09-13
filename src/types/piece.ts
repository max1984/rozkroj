export type GrainDirection = 'horizontal' | 'vertical' | 'none';

/** Which edges carry edge banding. top/bottom run along the width; left/right run along the height. */
export interface EdgeBanding {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface PieceDefinition {
  id: string;
  name: string;
  materialId: string;
  width: number;   // mm, internal
  height: number;  // mm, internal
  quantity: number;
  grain: GrainDirection;
  rotationAllowed: boolean;
  priority: boolean;
  edgeBanding: EdgeBanding;
  color: string;   // hex
}
