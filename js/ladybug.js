var Ladybug = function (loader, response) {
	var thisObject = this;

	Canvace.Buckets.setBucketSizeFactors(2, 2);

	var canvas = document.getElementById("canvas");
	var stage = new Canvace.Stage(response, canvas);
	var view = new stage.getView();

	if (!Canvace.mobileBrowser) {
		view.onDrag(function (dx, dy) {
			var offset = {
				x: ~~(dx / 2),
				y: ~~(dy / 4),
			};
			canvas.style["backgroundPosition"] = "center center, " + offset.x + "px " + offset.y + "px, left -600px";
		});
	}

	stage.forEachInstance(function (instance) {
		instance.getAcceleration().j = 28;
	}, {
		gravity: true
	});

	var characters = (function () {
		var matrix = {
			left: {
				unarmed: {},
				armed: {}
			},
			right: {
				unarmed: {},
				armed: {}
			}
		};
		var modes = ["still", "walking", "hurt", "dying"];
		for (var i in modes) {
			var mode = modes[i];
			matrix.left.unarmed[mode] = stage.getEntity({
				main: true,
				armed: false,
				direction: "left",
				mode: mode
			});
			matrix.left.armed[mode] = stage.getEntity({
				main: true,
				armed: true,
				direction: "left",
				mode: mode
			});
			matrix.right.unarmed[mode] = stage.getEntity({
				main: true,
				armed: false,
				direction: "right",
				mode: mode
			});
			matrix.right.armed[mode] = stage.getEntity({
				main: true,
				armed: true,
				direction: "right",
				mode: mode
			});
		}
		return matrix;
	})();
	var character = stage.getInstance({
		main: true
	});

	var bulletEntities = {
		left: stage.getEntity({
			bullet: true,
			direction: "left"
		}),
		right: stage.getEntity({
			bullet: true,
			direction: "right"
		})
	};
	var bullets = new Canvace.MultiSet();

	var characterLife = new (function () {
		var k = (272.0 / 5.0);
		var value = 5;

		var update = (function () {
			var life = document.getElementById("life-gauge");
			var leaf = document.getElementById("leaf");
			return function () {
				life.style["backgroundSize"] = ~~(value * k) + "px 100%, 100% 100%";
				leaf.style["left"] = (~~(value * k) - 15) + "px";
			}
		})();

		update();

		this.increase = function () {
			value = Math.min(value + 1, 5);
			update();
		};
		this.decrease = function () {
			value = Math.max(value - 1, 0);
			update();
		};
		this.isOver = function () {
			return (value == 0);
		};
	})();

	var rumbleDuration = 30;
	var rumbleOptions = {
		period: 3,
		extent: 1
	};

	var states = (function () {
		var armed = false;
		var velocity = character.getVelocity();
		var uniformVelocity = character.getUniformVelocity();
		function faceLeft(targetState) {
			return function () {
				character = character.replaceWith(characters.left[armed ? "armed" : "unarmed"].still);
				uniformVelocity.i = 0;
				return [targetState, "left"];
			};
		}
		function faceRight(targetState) {
			return function () {
				character = character.replaceWith(characters.right[armed ? "armed" : "unarmed"].still);
				uniformVelocity.i = 0;
				return [targetState, "right"];
			};
		}
		function walkLeft(targetState) {
			return function () {
				character = character.replaceWith(characters.left[armed ? "armed" : "unarmed"].walking);
				uniformVelocity.i = -3.125;
				return [targetState, "left"];
			};
		}
		function walkRight(targetState) {
			return function () {
				character = character.replaceWith(characters.right[armed ? "armed" : "unarmed"].walking);
				uniformVelocity.i = 3.125;
				return [targetState, "right"];
			};
		}
		function hurtLeft() {
			loop.getRenderer().addEffect(new Canvace.RumbleEffect(rumbleDuration, rumbleOptions));
			character = character.replaceWith(characters.left[armed ? "armed" : "unarmed"].hurt);
			velocity.i = 3.125;
			velocity.j = -12.5;
			uniformVelocity.i = 0;
			return ["hurt", "left"];
		}
		function hurtRight() {
			loop.getRenderer().addEffect(new Canvace.RumbleEffect(rumbleDuration, rumbleOptions));
			character = character.replaceWith(characters.right[armed ? "armed" : "unarmed"].hurt);
			velocity.i = -3.125;
			velocity.j = -12.5;
			uniformVelocity.i = 0;
			return ["hurt", "right"];
		}
		function hurtLeftThenWalk(direction) {
			return function () {
				loop.getRenderer().addEffect(new Canvace.RumbleEffect(rumbleDuration, rumbleOptions));
				character = character.replaceWith(characters.left[armed ? "armed" : "unarmed"].hurt);
				velocity.i = 3.125;
				velocity.j = -12.5;
				uniformVelocity.i = 0;
				return ["hurtThenWalk", "left", direction];
			};
		}
		function hurtRightThenWalk(direction) {
			return function () {
				loop.getRenderer().addEffect(new Canvace.RumbleEffect(rumbleDuration, rumbleOptions));
				character = character.replaceWith(characters.right[armed ? "armed" : "unarmed"].hurt);
				velocity.i = -3.125;
				velocity.j = -12.5;
				uniformVelocity.i = 0;
				return ["hurtThenWalk", "right", direction];
			};
		}
		function die(direction) {
			return function () {
				velocity.j = -12.5;
				uniformVelocity.i = 0;
				var dyingCharacter = character.fork(characters[direction][armed ? "armed" : "unarmed"].dying);
				character.remove();
				setTimeout(function () {
					document.getElementById("game-over").setAttribute("class", "cover");
					dyingCharacter.remove();
				}, 1500);
				return "dying";
			};
		}
		function arm(direction, mode) {
			return function () {
				character = character.replaceWith(characters[direction].armed[mode]);
				armed = true;
			};
		}
		function fire(direction) {
			var velocity = { left: -11, right: 11 };
			var offset = { left: 0, right: 1 };
			return function () {
				if (armed) {
					var position = character.getPosition();
					var bullet = bulletEntities[direction].createInstance(position.i + offset[direction], position.j + 1, position.k);
					bullet.getUniformVelocity().i = velocity[direction];
					bullets.add(bullet);

					if (!Canvace.mobileBrowser) {
						loader.getSound("click").playClone();
					}
				}
			};
		}
		return new Canvace.ParametricStateMachine([
			"startLeft",
			"stopLeft",
			"startRight",
			"stopRight",
			"startJump",
			"stopJump",
			"fall",
			"land",
			"hurtLeft",
			"hurtRight",
			"die",
			"arm",
			"fire",
			"foo"
		],{
			still: function (direction) {
				return {
					startLeft: walkLeft("walking"),
					stopLeft: walkRight("walking"),
					startRight: walkRight("walking"),
					stopRight: walkLeft("walking"),
					startJump: function () {
						velocity.j = -12.5;
						return ["jumping", direction];
					},
					fall: ["falling", direction],
					hurtLeft: hurtLeft,
					hurtRight: hurtRight,
					die: die(direction),
					arm: arm(direction, "still"),
					fire: fire(direction)
				};
			},
			walking: function (direction) {
				return {
					startLeft: faceRight("still"),
					stopLeft: faceLeft("still"),
					startRight: faceLeft("still"),
					stopRight: faceRight("still"),
					startJump: function () {
						velocity.j = -12.5;
						return ["jumpingAndMoving", direction];
					},
					fall: ["fallingAndMoving", direction],
					hurtLeft: hurtLeftThenWalk(direction),
					hurtRight: hurtRightThenWalk(direction),
					die: die(direction),
					arm: arm(direction, "walking"),
					fire: fire(direction)
				};
			},
			jumping: function (direction) {
				return {
					startLeft: walkLeft("jumpingAndMoving"),
					stopLeft: walkRight("jumpingAndMoving"),
					startRight: walkRight("jumpingAndMoving"),
					stopRight: walkLeft("jumpingAndMoving"),
					stopJump: ["falling", direction],
					land: function () {
						if (velocity.j >= 0) {
							velocity.j = -12.5;
						}
					},
					hurtLeft: hurtLeft,
					hurtRight: hurtRight,
					die: die(direction),
					arm: arm(direction, "still"),
					fire: fire(direction)
				};
			},
			jumpingAndMoving: function (direction) {
				return {
					startLeft: faceRight("jumping"),
					stopLeft: faceLeft("jumping"),
					startRight: faceLeft("jumping"),
					stopRight: faceRight("jumping"),
					stopJump: ["fallingAndMoving", direction],
					land: function () {
						if (velocity.j >= 0) {
							velocity.j = -12.5;
						}
					},
					hurtLeft: hurtLeftThenWalk(direction),
					hurtRight: hurtRightThenWalk(direction),
					die: die(direction),
					arm: arm(direction, "walking"),
					fire: fire(direction)
				};
			},
			falling: function (direction) {
				return {
					startLeft: walkLeft("fallingAndMoving"),
					stopLeft: walkRight("fallingAndMoving"),
					startRight: walkRight("fallingAndMoving"),
					stopRight: walkLeft("fallingAndMoving"),
					startJump: ["jumping", direction],
					land: ["still", direction],
					hurtLeft: hurtLeft,
					hurtRight: hurtRight,
					die: die(direction),
					arm: arm(direction, "still"),
					fire: fire(direction)
				};
			},
			fallingAndMoving: function (direction) {
				return {
					startLeft: faceRight("falling"),
					stopLeft: faceLeft("falling"),
					startRight: faceLeft("falling"),
					stopRight: faceRight("falling"),
					startJump: ["jumpingAndMoving", direction],
					land: ["walking", direction],
					hurtLeft: hurtLeftThenWalk(direction),
					hurtRight: hurtRightThenWalk(direction),
					die: die(direction),
					arm: arm(direction, "walking"),
					fire: fire(direction)
				};
			},
			hurt: function (direction) {
				return {
					startLeft: ["hurtThenWalk", direction, "left"],
					startRight: ["hurtThenWalk", direction, "right"],
					land: function () {
						character = character.replaceWith(characters[direction][armed ? "armed" : "unarmed"].still);
						velocity.i = 0;
						velocity.j = 0;
						return ["still", direction];
					},
					hurtLeft: hurtLeft,
					hurtRight: hurtRight,
					die: die(direction),
					arm: arm(direction, "hurt")
				};
			},
			hurtThenWalk: function (hurtDirection, walkDirection) {
				return {
					stopLeft: ["hurt", hurtDirection],
					stopRight: ["hurt", hurtDirection],
					land: function () {
						character = character.replaceWith(characters[walkDirection][armed ? "armed" : "unarmed"].walking);
						velocity.i = 0;
						velocity.j = 0;
						uniformVelocity.i = {
							left: -3.125,
							right: 3.125
						}[walkDirection];
						return ["walking", walkDirection];
					},
					hurtLeft: hurtLeft,
					hurtRight: hurtRight,
					die: die(hurtDirection),
					arm: arm(hurtDirection, "hurt")
				};
			},
			dying: {}
		}, ["still", "right"]);
	})();

	var keyboard = new Canvace.Keyboard(window);
	keyboard.onKeyDown(KeyEvent.DOM_VK_DOWN, function () {
		return false;
	});
	keyboard.onKeyDown(KeyEvent.DOM_VK_LEFT, states.startLeft);
	keyboard.onKeyUp(KeyEvent.DOM_VK_LEFT, states.stopLeft);
	keyboard.onKeyDown(KeyEvent.DOM_VK_RIGHT, states.startRight);
	keyboard.onKeyUp(KeyEvent.DOM_VK_RIGHT, states.stopRight);
	keyboard.onKeyDown([KeyEvent.DOM_VK_UP, KeyEvent.DOM_VK_X], states.startJump);
	keyboard.onKeyUp([KeyEvent.DOM_VK_UP, KeyEvent.DOM_VK_X], states.stopJump);
	keyboard.onKeyDown([KeyEvent.DOM_VK_SPACE, KeyEvent.DOM_VK_C], states.fire);

	if (Canvace.mobileBrowser) {
		var makeHandlerFunction = function (actionName) {
			return function (event) {
				states[actionName]();
				event.preventDefault();
				return false;
			};
		};

		var buttons = document.getElementsByClassName("button");
		for (var i = 0; i < buttons.length; ++i) {
			var startAction = buttons[i].getAttribute("data-start-action");
			buttons[i].addEventListener("touchstart", makeHandlerFunction(startAction), false);

			var stopAction = buttons[i].getAttribute("data-stop-action");
			buttons[i].addEventListener("touchend", makeHandlerFunction(stopAction), false);
		}
	}

	var weapons = new Canvace.MultiSet();
	stage.forEachInstance(function (weapon) {
		var t = 0;
		var position = weapon.getPosition();
		var remove = weapons.add({
			tick: function () {
				var v = character.testCollision(weapon);
				if (v.i || v.j) {
					weapon.remove();
					remove();
					states.arm();
				} else {
					position.j += (Math.sin(t + 0.15) - Math.sin(t)) * 0.2;
					t += 0.15;
				}
			}
		});
	}, {
		weapon: true
	});

	var spiderEntities = {
		still: stage.getEntity({
			enemy: true,
			direction: "left",
			mode: "still"
		}),
		dying: stage.getEntity({
			enemy: true,
			direction: "left",
			mode: "dying"
		})
	};

	this.score = 0;

	var scoreDisplay = document.getElementById("score");
	var spiders = new Canvace.MultiSet();
	stage.forEachInstance(function (spider) {
		var life = 3;
		var uniformVelocity = spider.getUniformVelocity();
		uniformVelocity.i = -2;
		var removeSpider = spiders.add({
			tick: function () {
				if (spider.tileCollision(function (walkable, properties) {
					return !walkable || properties.blockSpiders;
				}).i) {
					uniformVelocity.i = -uniformVelocity.i;
				}
				bullets.forEach(function (bullet, remove) {
					var v = bullet.testCollision(spider);
					if (v.i || v.j) {
						bullet.remove();
						remove();
						if (!--life) {
							uniformVelocity.i = 0;
							var dyingSpider = spider.fork(spiderEntities.dying);
							spider.remove();
							removeSpider();
							dyingSpider.getVelocity().j = -12.5;

							scoreDisplay.textContent = (++thisObject.score);
						}
					}
				});
				var v = character.collision(spider);
				if (v.i || v.j) {
					characterLife.decrease();
					if (characterLife.isOver()) {
						states.die();
					} else if (v.i > 0) {
						states.hurtLeft();
					} else {
						states.hurtRight();
					}
				}
			}
		});
	}, {
		enemy: true
	});

	if (Canvace.mobileBrowser) {
		Canvace.RenderLoop.setLoop("interval");
	}

	var synchronizer = new view.Synchronizer(300, 250, 0);
	var loop = new Canvace.RenderLoop(stage, new stage.Range(1500, 1000), loader, function () {
		stage.forEachInstance(function (instance) {
			if (instance.getPosition().j > 20) {
				instance.remove();
			}
		});
		var win = false;
		if (character.tileCollision(function (walkable, properties) {
			if (properties.win) {
				win = true;
			}
			return !walkable;
		}).j < 0) {
			states.land();
		}
		if (win) {
			character.remove();
			document.getElementById("level-cleared").setAttribute("class", "cover");
			onecatAPI.stop(this.score);
		}
		weapons.fastForEach(function (weapon) {
			weapon.tick();
		});
		spiders.fastForEach(function (spider) {
			spider.tick();
		});
		bullets.forEach(function (bullet, remove) {
			if (bullet.collidesWithTiles()) {
				bullet.remove();
				remove();
			}
		});
		if (character.getVelocity().j > 0) {
			states.fall();
		}
	}, function () {
		synchronizer.tick(character);
	});

	var caketown = loader.getSound("caketown");
	caketown.setLooping(true);

	this.play = function () {
		caketown.play();
		loop.run();
	};

	this.pause = function () {
		caketown.pause();
		loop.suspend();
	};
}

Ladybug.soundAssets = {
	"caketown": ["caketown.mp3", "caketown.ogg"],
	"click": ["click.mp3", "click.ogg"]
};
