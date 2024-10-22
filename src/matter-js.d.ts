declare module 'matter-js' {
    export namespace Matter {
        interface Engine {
            world: World;
        }
        interface World extends Composite {}
        interface Render {}
        interface Runner {}
        interface Composite {
            bodies: Body[];
        }
        interface Body {
            position: {
                x: number;
                y: number;
            };
        }
        interface Bodies {
            rectangle(x: number, y: number, width: number, height: number, options?: any): Body;
        }
        interface Vector {
            create(x: number, y: number): Vector;
        }

        const Engine: {
            create(options?: any): Engine;
            clear(engine: Engine): void;
            update(engine: Engine, delta: number): void;
        };
        const Render: {
            create(options: any): Render;
            run(render: Render): void;
            stop(render: Render): void;
        };
        const Runner: {
            create(): Runner;
            run(runner: Runner, engine: Engine): void;
            stop(runner: Runner): void;
        };
        const Composite: {
            create(): Composite;
            add(composite: Composite, body: Body | Body[]): void;
            remove(composite: Composite, body: Body, deep?: boolean): void;
        };
        const Bodies: Bodies;
        const Vector: Vector;
    }

    export default Matter;
}
