export type GrainDirection = 'horizontal' | 'vertical' | 'none';

export interface PieceDefinition {
  id: string;
  name: string;
  width: number;   // mm, internal
  height: number;  // mm, internal
  quantity: number;
  grain: GrainDirection;
  rotationAllowed: boolean;
  priority: boolean;
  color: string;   // hex
}
