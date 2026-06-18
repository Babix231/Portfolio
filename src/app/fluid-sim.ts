export class FluidSim {
  readonly N: number;
  private readonly S: number;
  private readonly SIZE: number;
  private readonly dt = 0.016;
  private readonly diff: number;
  private readonly visc: number;

  dr: Float32Array; dg: Float32Array; db: Float32Array;
  private pr: Float32Array; private pg: Float32Array; private pb: Float32Array;
  vx: Float32Array; vy: Float32Array;
  vx0: Float32Array; vy0: Float32Array;

  constructor(N = 100, diff = 0, visc = 0) {
    this.N = N;
    this.S = N + 2;
    this.SIZE = this.S * this.S;
    this.diff = diff;
    this.visc = visc;
    this.dr = new Float32Array(this.SIZE); this.dg = new Float32Array(this.SIZE); this.db = new Float32Array(this.SIZE);
    this.pr = new Float32Array(this.SIZE); this.pg = new Float32Array(this.SIZE); this.pb = new Float32Array(this.SIZE);
    this.vx = new Float32Array(this.SIZE); this.vy = new Float32Array(this.SIZE);
    this.vx0 = new Float32Array(this.SIZE); this.vy0 = new Float32Array(this.SIZE);
  }

  ix(x: number, y: number): number {
    return (Math.max(0, Math.min(this.N + 1, x | 0))) + this.S * (Math.max(0, Math.min(this.N + 1, y | 0)));
  }

  addDensity(x: number, y: number, r: number, g: number, b: number): void {
    const i = this.ix(x, y);
    this.dr[i] += r; this.dg[i] += g; this.db[i] += b;
  }

  addVelocity(x: number, y: number, vx: number, vy: number): void {
    const i = this.ix(x, y);
    this.vx[i] += vx; this.vy[i] += vy;
  }

  step(): void {
    // velocity step
    this.vx0.set(this.vx); this.diffuse(1, this.vx, this.vx0, this.visc);
    this.vy0.set(this.vy); this.diffuse(2, this.vy, this.vy0, this.visc);
    this.project(this.vx, this.vy, this.vx0, this.vy0);
    this.vx0.set(this.vx); this.vy0.set(this.vy);
    this.advect(1, this.vx, this.vx0, this.vx0, this.vy0);
    this.advect(2, this.vy, this.vy0, this.vx0, this.vy0);
    this.project(this.vx, this.vy, this.vx0, this.vy0);

    // density step
    this.pr.set(this.dr); this.pg.set(this.dg); this.pb.set(this.db);
    this.diffuse(0, this.dr, this.pr, this.diff);
    this.diffuse(0, this.dg, this.pg, this.diff);
    this.diffuse(0, this.db, this.pb, this.diff);
    this.pr.set(this.dr); this.pg.set(this.dg); this.pb.set(this.db);
    this.advect(0, this.dr, this.pr, this.vx, this.vy);
    this.advect(0, this.dg, this.pg, this.vx, this.vy);
    this.advect(0, this.db, this.pb, this.vx, this.vy);

    // dissipate
    for (let i = 0; i < this.SIZE; i++) {
      this.dr[i] *= 0.993; this.dg[i] *= 0.993; this.db[i] *= 0.993;
      this.vx[i] *= 0.999; this.vy[i] *= 0.999;
    }
  }

  private setBnd(b: number, x: Float32Array): void {
    const N = this.N;
    for (let i = 1; i <= N; i++) {
      x[this.ix(0,   i)] = b === 1 ? -x[this.ix(1, i)] : x[this.ix(1, i)];
      x[this.ix(N+1, i)] = b === 1 ? -x[this.ix(N, i)] : x[this.ix(N, i)];
      x[this.ix(i,   0)] = b === 2 ? -x[this.ix(i, 1)] : x[this.ix(i, 1)];
      x[this.ix(i, N+1)] = b === 2 ? -x[this.ix(i, N)] : x[this.ix(i, N)];
    }
    x[this.ix(0,   0  )] = 0.5*(x[this.ix(1,   0)]+x[this.ix(0,   1)]);
    x[this.ix(0,   N+1)] = 0.5*(x[this.ix(1, N+1)]+x[this.ix(0,   N)]);
    x[this.ix(N+1, 0  )] = 0.5*(x[this.ix(N,   0)]+x[this.ix(N+1, 1)]);
    x[this.ix(N+1, N+1)] = 0.5*(x[this.ix(N, N+1)]+x[this.ix(N+1, N)]);
  }

  private linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number): void {
    const cR = 1 / c;
    for (let iter = 0; iter < 4; iter++) {
      for (let j = 1; j <= this.N; j++) {
        for (let i = 1; i <= this.N; i++) {
          x[this.ix(i,j)] = (x0[this.ix(i,j)] + a*(
            x[this.ix(i+1,j)] + x[this.ix(i-1,j)] +
            x[this.ix(i,j+1)] + x[this.ix(i,j-1)]
          )) * cR;
        }
      }
      this.setBnd(b, x);
    }
  }

  private diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number): void {
    const a = this.dt * diff * this.N * this.N;
    this.linSolve(b, x, x0, a, 1 + 4 * a);
  }

  private project(vx: Float32Array, vy: Float32Array, p: Float32Array, div: Float32Array): void {
    const N = this.N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[this.ix(i,j)] = -0.5*(
          vx[this.ix(i+1,j)] - vx[this.ix(i-1,j)] +
          vy[this.ix(i,j+1)] - vy[this.ix(i,j-1)]
        ) / N;
        p[this.ix(i,j)] = 0;
      }
    }
    this.setBnd(0, div); this.setBnd(0, p);
    this.linSolve(0, p, div, 1, 4);
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        vx[this.ix(i,j)] -= 0.5*(p[this.ix(i+1,j)] - p[this.ix(i-1,j)])*N;
        vy[this.ix(i,j)] -= 0.5*(p[this.ix(i,j+1)] - p[this.ix(i,j-1)])*N;
      }
    }
    this.setBnd(1, vx); this.setBnd(2, vy);
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, vx: Float32Array, vy: Float32Array): void {
    const N = this.N, dt0 = this.dt * N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        let x = i - dt0 * vx[this.ix(i,j)];
        let y = j - dt0 * vy[this.ix(i,j)];
        x = Math.max(0.5, Math.min(N + 0.5, x));
        y = Math.max(0.5, Math.min(N + 0.5, y));
        const i0 = x|0, i1 = i0+1, j0 = y|0, j1 = j0+1;
        const s1 = x-i0, s0 = 1-s1, t1 = y-j0, t0 = 1-t1;
        d[this.ix(i,j)] =
          s0*(t0*d0[this.ix(i0,j0)] + t1*d0[this.ix(i0,j1)]) +
          s1*(t0*d0[this.ix(i1,j0)] + t1*d0[this.ix(i1,j1)]);
      }
    }
    this.setBnd(b, d);
  }
}
