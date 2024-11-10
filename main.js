// main.js
// Import Vue.js
// import { createApp } from "./vue.esm-browser.js";
import { createApp } from "https://cdn.jsdelivr.net/npm/vue@3.4.27/dist/vue.esm-browser.prod.js";

// Import the components
import { component_data_reader } from "./component_data_reader.js";
import { component_exporter } from "./component_exporter.js";

import { calc_distance } from "./calc_distance.js";

const sum = xs => xs.reduce((a, b) => a + b, 0);
const round = (x, y = 0) => Number(x.toFixed(y));


const app_config = {
	data() {
		return {
			text_list: [],
			work_list: [],
			codebook: [],
			mode: "none",
			selected_entry: "",
			codebook_index: null,
			show_help: false,
			na_value: 99
		};
	},
	components: {
		"data-reader": component_data_reader,
		"exporter": component_exporter
	},
	computed: {
		done_cnt: function() {
			return sum(this.work_list.filter(a => a.codebook_gid !== undefined).map(a => a.count));
		},
		done_pct: function() {
			return round(this.done_cnt / this.text_list.length * 100, 1);
		},
		wl_done_cnt: function() {
			return this.work_list.filter(a => a.codebook_gid !== undefined).length;
		},
		wl_done_pct: function() {
			return round(this.wl_done_cnt / this.work_list.length * 100, 1);
		},
		current_entry_class: function() {
			if (this.mode == "work_list" || this.mode == "move_to") return "orange";
			if (this.mode == "codebook") return "green";
			return "";
		},
		is_auto_add_disabled: function() {
			return this.work_list.filter(a => a.codebook_gid === undefined && a.difference !== '' && a.difference <= 1).length == 0;
		}
	},
	methods: {
		handleReadData(payload) {
			this.text_list = payload.text_list;
			this.work_list = payload.work_list;
			this.codebook = payload.codebook;
		},
		clear_mode: function() {
			this.mode = "none";
			this.selected_entry = "";
			this.codebook_index = null;
			this.work_list.forEach(a => a.difference = "");
		},
		update_similarities: function(index) {
			if (this.codebook[index].words.length == 0) {
				this.work_list = this.work_list.map(a => {
					if (a.codebook_gid !== undefined) {
						return a;
					} else {
						const difference = Math.min(calc_distance(a.string, this.codebook[index].string), calc_distance(a.translit, this.codebook[index].string) + 1);
						return {...a, difference};
					}
				}).toSorted((a, b) => a.difference - b.difference);
			} else {
				this.work_list = this.work_list.map(a => {
					if (a.codebook_gid !== undefined) {
						return a;
					} else {
						const words = this.codebook[index].words;
						const difference = Math.min(...words.map(word => calc_distance(a.string, word)), ...words.map(word => calc_distance(a.translit, word) + 1));
						return {...a, difference};
					}
				}).toSorted((a, b) => a.difference - b.difference);
			}
		},
		string_action: function(index) {
			if (this.mode == "codebook") {
				this.confirm(index);
			} else {
				this.move_to(this.work_list[index].string)
			}
		},
		similar_to_this: function(index) {
			this.mode = "work_list"
			this.selected_entry = this.work_list[index].string;
			this.work_list = this.work_list.map(a => {
				const difference = Math.min(calc_distance(a.string, this.work_list[index].string), calc_distance(a.translit, this.work_list[index].string) + 1);
				return {...a, difference};
			}).toSorted((a, b) => a.difference - b.difference);
		},
		similar_to_codebook: function(index) {
			this.mode = "codebook"
			this.codebook_index = index;
			this.selected_entry = this.codebook[index].display_name;

			this.update_similarities(index);
		},
		move_to: function(string) {
			this.mode = "move_to";
			this.selected_entry = string;
		},
		reset_mode: function() {
			this.mode = "work_list";
		},
		add_here: function(index) {
			const work_list_id = this.work_list.findIndex(a => a.string == this.selected_entry);
			this.codebook[index].words.unshift(this.selected_entry);
			this.codebook[index].count += this.work_list[work_list_id].count;
			this.work_list[work_list_id].codebook_gid = this.codebook[index].gid;
			this.selected_entry = "";
			this.mode = "none";
		},
		confirm: function(index) {
			this.codebook[this.codebook_index].words.unshift(this.work_list[index].string);
			this.codebook[this.codebook_index].count += this.work_list[index].count;
			this.work_list[index].codebook_gid = this.codebook[this.codebook_index].gid;
			this.update_similarities(this.codebook_index);
		},
		auto_add: function() {
			const xs = this.work_list.map((a, i) => (a.codebook_gid === undefined && a.difference !== "" && a.difference <= 1) ? i : -1).filter(a => a != -1);
			for (const work_list_id of xs) {
				this.codebook[this.codebook_index].words.unshift(this.work_list[work_list_id].string);
				this.codebook[this.codebook_index].count += this.work_list[work_list_id].count;
				this.work_list[work_list_id].codebook_gid = this.codebook[this.codebook_index].gid;
			}
			this.update_similarities(this.codebook_index);
		},
		auto_add_all: function() {
			for (const i in this.codebook) {
				this.similar_to_codebook(i);
				this.auto_add();
			}
			this.clear_mode();
			this.order_work_list();
		},
		new_codebook_entry: function() {
			const gid = Math.max(...this.codebook.map(a => a.gid)) + 1;
			const code = Math.max(...this.codebook.map(a => a.code)) + 1;
			this.codebook.push({display_name: this.selected_entry, string: this.selected_entry, gid: gid, words: [], count: 0, code: code});
			this.move_to(this.selected_entry);
			this.add_here(this.codebook.length - 1);
			this.similar_to_codebook(this.codebook.length - 1);
		},
		remove_key: function(index) {
			this.codebook[index].words.forEach(word => {
				this.work_list[this.work_list.findIndex(a => word == a.string)].codebook_gid = undefined;
			});
			this.codebook.splice(index, 1);
			this.clear_mode();
		},
		delete_word: function(index, windex) {
			const del_index = this.work_list.findIndex(a => this.codebook[index].words[windex] == a.string);
			this.work_list[del_index].codebook_gid = undefined;
			this.codebook[index].count -= this.work_list[del_index].count;
			this.codebook[index].words.splice(windex, 1);
			this.clear_mode();
		},
		order_work_list: function() {
			this.work_list = this.work_list.toSorted((a, b) => b.count - a.count);
		},
		order_work_list_string: function() {
			this.work_list = this.work_list.toSorted((a, b) => {
				if (a.string > b.string) return 1;
				if (a.string < b.string) return -1;
				return 0;
			});
		},
		toggle_help() {
			this.show_help = !this.show_help;
		},
		close_help() {
			this.show_help = false;
		}
	}
};

createApp(app_config).mount('#app');
