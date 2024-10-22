(function() {
    const vscode = acquireVsCodeApi();

    let engine, render, runner;

    // 如果 requestAnimationFrame 不存在，我们需要提供一个替代方案
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            return setTimeout(callback, 1000 / 60);
        };
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'initRender':
                if (!engine) {
                    engine = Matter.Engine.create();
                    render = Matter.Render.create({
                        canvas: document.getElementById('falling-chars-canvas'),
                        engine: engine,
                        options: {
                            width: message.width,
                            height: message.height,
                            wireframes: false,
                            background: 'transparent'
                        }
                    });
                    runner = Matter.Runner.create();

                    Matter.Render.run(render);
                    Matter.Runner.run(runner, engine);
                }
                break;
            case 'createFallingLetter':
                if (engine && render) {
                    const letter = Matter.Bodies.rectangle(
                        message.position.x,
                        message.position.y,
                        8.5,
                        17,
                        {
                            render: {
                                fillStyle: '#cccccc',
                                text: message.char
                            }
                        }
                    );
                    Matter.Composite.add(engine.world, letter);
                }
                break;
        }
    });
})();
