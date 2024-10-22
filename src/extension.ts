// 导入必要的模块
import * as vscode from 'vscode';
import Matter from 'matter-js';

// 定义FallingLetter接口
interface FallingLetter {
	char: string;
	body: Matter.Body;
	decorationType: vscode.TextEditorDecorationType;
	createdAt: number; // 添加创建时间
}

// 全局变量
let fallingLetters: FallingLetter[] = [];
let engine: Matter.Engine;
let runner: Matter.Runner;
let animationInterval: NodeJS.Timeout | undefined;
const CHAR_WIDTH = 8;
const CHAR_HEIGHT = 20;

// 在全局变量部分添加
const MAX_FALLING_LETTERS = 50;
const LETTER_LIFETIME = 60000; // 60 seconds in milliseconds

// 激活扩展时的回调函数
export function activate(context: vscode.ExtensionContext) {
	// 保留原有的命令注册
	let helloWorldDisposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from VSCode Extension!');
	});

	// 添加新命令用于启动字符掉落功能
	let fallingCharsDisposable = vscode.commands.registerCommand('extension.startFallingChars', () => {
		vscode.window.showInformationMessage('Falling Characters activated!');
		startFallingCharsEffect();
	});

	context.subscriptions.push(helloWorldDisposable, fallingCharsDisposable);

	// 立即启动掉落效果
	startFallingCharsEffect();

	// 监听编辑器文本变化
	let textChangeDisposable = vscode.workspace.onDidChangeTextDocument(handleTextChange);
	context.subscriptions.push(textChangeDisposable);

	initPhysics();

	// 在激活扩展时初始化lastDocumentContent
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		lastDocumentContent = editor.document.getText();
	}
}

// 存储上一次文档的内容
let lastDocumentContent: string = '';

// 处理文本变化
function handleTextChange(event: vscode.TextDocumentChangeEvent) {
	console.log('Text change detected');
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document !== event.document) return;

	const currentContent = editor.document.getText();

	event.contentChanges.forEach(change => {
		console.log('Change detected:', change);
		if (change.text === '' && change.rangeLength > 0) {
			// 计算被删除的字符
			const deletedChars = lastDocumentContent.substring(change.rangeOffset, change.rangeOffset + change.rangeLength);
			console.log('Deleted chars:', deletedChars);

			// 使用删除的字符创建掉落效果
			if (deletedChars) {
				const startPosition = editor.document.positionAt(change.rangeOffset);
				for (let i = 0; i < deletedChars.length; i++) {
					const charPosition = startPosition.translate(0, i);
					createFallingLetters(deletedChars[i], charPosition, editor);
				}
			}
		}
	});

	// 更新lastDocumentContent为当前文档内容
	lastDocumentContent = currentContent;
}

// 创建掉落的字符
function createFallingLetters(text: string, position: vscode.Position, editor: vscode.TextEditor) {
	console.log('Creating falling letters for:', text);

	const visibleRange = editor.visibleRanges[0];
	const startLine = visibleRange.start.line;
	const startChar = visibleRange.start.character;

	text.split('').forEach((char, index) => {
		const x = (position.character - startChar) * CHAR_WIDTH;
		const y = (position.line - startLine) * CHAR_HEIGHT;

		console.log(`Creating letter '${char}' at: ${x}, ${y}`);

		const body = Matter.Bodies.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, {
			restitution: 0.3,
			friction: 0.1,
			density: 0.001,
		});

		const fallingLetter: FallingLetter = {
			char,
			body,
			createdAt: Date.now(),
			decorationType: vscode.window.createTextEditorDecorationType({
				before: {
					contentText: char,
					color: 'rgba(255, 255, 255, 1)',
					backgroundColor: 'transparent',
					fontWeight: 'bold',
					fontStyle: 'italic',
					textDecoration: `none; position: absolute; left: ${x}px; top: ${y}px;`
				}
			})
		};

		fallingLetters.push(fallingLetter);
		Matter.Composite.add(engine.world, body);
	});

	cleanupExcessLetters();
}

// 开始掉落字符效果
function startFallingCharsEffect() {
	console.log('Starting falling chars effect');
	if (animationInterval) {
		clearInterval(animationInterval);
	}

	const FPS = 60; // 提高帧率以获得更流畅的效果
	const FRAME_DURATION = 1000 / FPS;

	animationInterval = setInterval(() => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const visibleRange = editor.visibleRanges[0];
		const startLine = visibleRange.start.line;
		const startChar = visibleRange.start.character;

		fallingLetters.forEach(letter => {
			letter.decorationType.dispose();
			letter.decorationType = vscode.window.createTextEditorDecorationType({
				before: {
					contentText: letter.char,
					color: 'rgba(255, 255, 255, 1)',
					backgroundColor: 'transparent',
					fontWeight: 'bold',
					fontStyle: 'italic',
					textDecoration: `none; position: absolute; left: ${letter.body.position.x - startChar * CHAR_WIDTH}px; top: ${Math.round(letter.body.position.y - startLine * CHAR_HEIGHT)}px;`
				}
			});

			editor.setDecorations(letter.decorationType, [new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1))]);
		});

		Matter.Engine.update(engine, FRAME_DURATION);

		cleanupLetters();
	}, FRAME_DURATION);
}

// 创建一个全局的装饰类型
const fallingLetterDecorationType = vscode.window.createTextEditorDecorationType({});

// 初始化物理引擎
function initPhysics() {
	engine = Matter.Engine.create({
			gravity: { x: 0, y: 0.5, scale: 0.001 }
		});
	runner = Matter.Runner.create();
	Matter.Runner.run(runner, engine);

	const editor = vscode.window.activeTextEditor;
	if (editor) {
		// 获取编辑器的可见范围
		const visibleRange = editor.visibleRanges[0];

		// 计算编辑器的宽度和高度（以像素为单位）
		const editorWidth = (visibleRange.end.character - visibleRange.start.character) * CHAR_WIDTH;
		const editorHeight = (visibleRange.end.line - visibleRange.start.line + 1) * CHAR_HEIGHT;

		console.log(`Editor dimensions: ${editorWidth}x${editorHeight}`);

		// 创建地面，位于编辑器底部
		const ground = Matter.Bodies.rectangle(editorWidth / 2, editorHeight, editorWidth, 50, { isStatic: true });

		// 创建左右墙壁
		const leftWall = Matter.Bodies.rectangle(0, editorHeight / 2, 10, editorHeight, { isStatic: true });
		const rightWall = Matter.Bodies.rectangle(editorWidth, editorHeight / 2, 10, editorHeight, { isStatic: true });

		// 创建顶部边界
		const topWall = Matter.Bodies.rectangle(editorWidth / 2, 0, editorWidth, 10, { isStatic: true });

		Matter.Composite.add(engine.world, [ground, leftWall, rightWall, topWall]);

		console.log(`Ground position: ${editorHeight}`);
	}
}

// 这个方法在插件停用时调用
export function deactivate() {
	if (animationInterval) {
		clearInterval(animationInterval);
	}
	Matter.Runner.stop(runner);
	Matter.Engine.clear(engine);
	fallingLetters.forEach(letter => letter.decorationType.dispose());
	fallingLetters = [];
}

// 添加清理函数
function cleanupLetters() {
	const now = Date.now();
	fallingLetters = fallingLetters.filter(letter => {
		if (now - letter.createdAt > LETTER_LIFETIME) {
			Matter.Composite.remove(engine.world, letter.body);
			return false;
		}
		return true;
	});
}
function cleanupExcessLetters() {
	while (fallingLetters.length > MAX_FALLING_LETTERS) {
		const oldestLetter = fallingLetters.shift();
		if (oldestLetter) {
			Matter.Composite.remove(engine.world, oldestLetter.body);
			oldestLetter.decorationType.dispose();
		}
	}
}

