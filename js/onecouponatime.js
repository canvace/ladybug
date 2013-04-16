///////////////////////////////////////////////////////////////////////////////
// This file provides integration with Onecouponatime [1], a platform for
// social and gaming couponing. It's based on their work and it should be
// considered their intellectual property. Please contact them in case you
// want to reuse this code.
//
// [1] http://www.onecouponatime.com/
//

var onecatAPI = {

	start: function () {
		if (typeof parent.Game !== "undefined") {
			parent.Game.start();
		}
	},

	stop: function (score) {
		if (typeof parent.Game !== "undefined") {
			parent.Game.stop(score);
		}
	},

	ping: function (score) {
		if (typeof parent.Game !== "undefined") {
			parent.Game.ping(score);
		}
	},

	sleep: function (score) {
		if (typeof parent.Game !== "undefined") {
			parent.Game.sleep(score);
		}
	},

	awake: function () {
		if (typeof parent.Game !== "undefined") {
			parent.Game.awake();
		}
	},

	player: function () {
		if (typeof parent.Game !== "undefined") {
			return parent.Game.player;
		} else {
			return {id: 0, nickname: "Test Player"};
		}
	},

	rank: function () {
		if (typeof parent.Game !== "undefined") {
			return parent.Game.rank;
		} else {
			return [
				{id: 0, nickname: "Matteo", score: 50},
				{id: 0, nickname: "Marco",  score: 30},
				{id: 0, nickname: "Pietro", score: 20},
				{id: 0, nickname: "Mattia", score: 10},
				{id: 0, nickname: "Fabio",  score: 5}
			];
		}
	}
};