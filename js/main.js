const transliterate = (string) => [...string].map(a => translit_map.has(a) ? translit_map.get(a) : a).join("");

function levenshtein_fast(a, b) {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	let matrix = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) == a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}

	return matrix[b.length][a.length];
};

let levenstein_cache = new Map();

function levenstein_cached(x, y) {
	if (x > y) [x, y] = [y, x];

	if (!levenstein_cache.has(x)) levenstein_cache.set(x, new Map());

	if (levenstein_cache.get(x).has(y))	{
		return levenstein_cache.get(x).get(y);
	} else {
		const value = levenshtein_fast(x, y);

		levenstein_cache.get(x).set(y, value);

		return value;
	}
}

function calc_similarity(x, y) {
	const dist = levenstein_cached(x, y);
	return dist >= x.length ? 0 : 1 - dist / x.length;
}

// const normalize = xs => xs.toLowerCase().replace(/[^\-()a-zA-Z0-9\u0400-\u04FF]/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = xs => xs.toLowerCase().replace(/[^\p{L}\p{N}\-()]/gu, " ").replace(/\s+/g, " ").trim();

const main = new Vue({
	el: ".vue",
	data: {
		raw_input: "",
		dic_template: "",
		raw_output: "",
		data: [],
		input_data: "",
		text_list: [],
		work_list: [],
		dic: [],
		autorec_trs: 20,
		autofill_trs: 90,
		dic_index: null,
		selected_entry: null
	},
	computed: {
		done_cnt: function() {
			return sum(this.work_list.filter(a => a.dic_value !== undefined).map(a => a.count));
		},
		done_pct: function() {
			return round(this.done_cnt / this.text_list.length * 100, 1);
		},
		wl_done_cnt: function() {
			return this.work_list.filter(a => a.dic_value !== undefined).length;
		},
		wl_done_pct: function() {
			return round(this.wl_done_cnt / this.work_list.length * 100, 1);
		}
	},
	methods: {
		read_data: function() {
			this.text_list = this.raw_input.trim().split("\n").map(a => ({
				r: a,
				k: normalize(a)
			}));

			let counts = Object.fromEntries([...new Set(this.text_list.map(a => a.k))].map(a => [a, 0]));

			this.text_list.map(a => a.k).forEach(a => counts[a]++);

			this.work_list = Object.entries(counts).map(([key, value]) => ({
				string: key,
				count: value,
				translit: transliterate(key),
				similarity: 0
			})).toSorted((a, b) => b.count - a.count);
		},
		read_dic: function() {
			let dic = [];

			this.dic_template.split("\n").filter(a => a.length > 0).forEach(a => {
				const xs = a.split("\t");
				dic.push({
					display_name: xs[1],
					string: normalize(xs[1]),
					words: [],
					count: 0,
					code: Number(xs[0])
				});
			});

			this.dic = dic;
		},
		gen_dic: function() {
			let dic = structuredClone(this.work_list.filter(a => a.count >= this.autorec_trs));

			const get_display_name = string => {
				const xs = this.text_list.filter(a => a.k == string).map(a => a.r);

				let counts = Object.fromEntries([...new Set(xs)].map(a => [a, 0]));

				xs.forEach(a => counts[a]++);

				const max = Math.max(...Object.values(counts));

				return Object.entries(counts).find(([key, value]) => value == max)[0];
				return Object.keys(counts).find((key) => counts[key] == max);
			}

			for (let [i, elem] of dic.entries()) {
				elem.display_name = get_display_name(elem.string);
				elem.words = [];
				elem.count = 0;
				elem.code = i + 1;
			}

			this.dic = dic;
		},
		update_similarities: function() {
			if (this.dic[this.dic_index].words.length == 0) {
				this.work_list = this.work_list.map(a => {
					const similarity = round(Math.max(calc_similarity(a.string, this.dic[this.dic_index].string), calc_similarity(a.translit, this.dic[this.dic_index].string)) * 100);
					return {...a, similarity};
				}).toSorted((a, b) => b.similarity - a.similarity);
			} else {
				this.work_list = this.work_list.map(a => {
					if (a.dic_value !== undefined) {
						return a;
					} else {
						const words = this.dic[this.dic_index].words;
						const similarity = round(Math.max(...words.map(word => calc_similarity(a.string, word)), ...words.map(word => calc_similarity(a.translit, word))) * 100);
						return {...a, similarity};
					}
				}).toSorted((a, b) => b.similarity - a.similarity);
			}
		},
		work_with: function(index) {
			this.dic_index = index;
			this.update_similarities();
		},
		add_here: function(dic_index) {
			this.dic[dic_index].words.unshift(this.work_list[this.selected_entry].string);
			this.dic[dic_index].count += this.work_list[this.selected_entry].count;
			this.$set(this.work_list[this.selected_entry], "dic_value", this.dic[dic_index].string);
			// this.work_list[this.selected_entry].dic_value = this.dic[dic_index].string;
			this.selected_entry = null;
			// this.$forceUpdate();
			// this.work_list = this.work_list
			// this.update_similarities();
		},
		remove_key: function(index) {
			this.dic[index].words.forEach(word => {
				this.work_list[this.work_list.findIndex(a => word == a.string)].dic_value = undefined;
			});
			this.dic.splice(index, 1);
		},
		delete_word: function(index, windex) {
			const del_index = this.work_list.findIndex(a => this.dic[index].words[windex] == a.string);
			this.work_list[del_index].dic_value = undefined;
			this.dic[index].count -= this.work_list[del_index].count;
			this.dic[index].words.splice(windex, 1);
			this.update_similarities();
		},
		confirm: function(index) {
			if (this.dic_index !== null) {
				this.dic[this.dic_index].words.unshift(this.work_list[index].string);
				this.dic[this.dic_index].count += this.work_list[index].count;
				// this.work_list[index].dic_value = this.dic[this.dic_index].string;
				this.$set(this.work_list[index], "dic_value", this.dic[this.dic_index].string);
				// this.$forceUpdate();
				this.update_similarities();
			} else {
				this.selected_entry = index;
			}
		},
		add_to_dic: function(index) {
			const elem = this.work_list[index];
			this.dic.push({display_name: elem.string, string: elem.string, words: [], count: 0});
			this.work_with(this.dic.length - 1);
		},
		similar_to_this: function(index) {
			this.dic_index = null;
			this.work_list = this.work_list.map(a => {
				const similarity = round(Math.max(calc_similarity(a.string, this.work_list[index].string), calc_similarity(a.translit, this.work_list[index].string)) * 100);
				return {...a, similarity};
			}).toSorted((a, b) => b.similarity - a.similarity);
		},
		autofill_entry: function() {
			let index = -1;
			do {
				index = this.work_list.findIndex(a => a.dic_value === undefined && a.similarity >= this.autofill_trs);
				if (index != -1) this.confirm(index);
			} while (index != -1);
		},
		autofill_all: function() {
			iota(this.dic.length).forEach(i => {
				this.work_with(i);
				this.autofill_entry();
			})
		},
		clear_selection: function() {
			this.dic_index = null;
			this.selected_entry = null;
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
		order_dic_list: function() {
			this.dic = this.dic.toSorted((a, b) => a.code - b.code);
		},
		copy_to_clipboard: function() {
			// console.log("export");

			// console.log(this.dic);
			// console.log(this.dic.map(b => b.string));


			// const get_work_list_dic_value = a => (this.work_list.filter(b => b.string == a)[0]).dic_value

			const get_dic_code = a => {
				const code = this.dic.filter(b => b.words.some(c => c == a));
				return code.length > 0 ? code[0].code : "";
			}

			let export_list = this.text_list.map(a => [a.r, get_dic_code(a.k)].join("\t"));

			let export_string = export_list.join("\n");

			// console.log(export_string);
			copy_to_clipboard(export_string);

			// this.text_list = this.raw_input.split("\n").map(a => ({
			// 	r: a,
			// 	k: normalize(a)
			// }));

			// let counts = Object.fromEntries([...new Set(this.text_list.map(a => a.k))].map(a => [a, 0]));

			// this.text_list.map(a => a.k).forEach(a => counts[a]++);

			// this.work_list = Object.entries(counts).map(([key, value]) => ({
			// 	string: key,
			// 	count: value,
			// 	translit: transliterate(key),
			// 	similarity: 0
			// })).toSorted((a, b) => b.count - a.count);
		}
	}
});

// main.raw_input = raw_data;

// main.read_data();
// main.gen_dic();

