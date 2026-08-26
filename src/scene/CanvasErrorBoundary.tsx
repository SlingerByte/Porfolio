import { Component, type ReactNode } from 'react'

/**
 * Guards the lazy 3D scene: any runtime WebGL failure unmounts only the canvas.
 * DOM content lives outside this boundary and always survives.
 */
export class CanvasErrorBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFail()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
