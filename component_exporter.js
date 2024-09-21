// component_exporter.js
export const component_exporter = {
	template: `
		<div>
			<h3>Export</h3>
			<div class="export_block">
				<div class="flex">
					<button @click="copy_result(false)">Copy result</button>
					<div>/</div>
					<div class="copy_na"><button @click="copy_result(true)">Copy result with NA =</button><input type="number" v-model="na_value" style="width: 6ch;"></div>
				</div>
				<button @click="copy_codebook">Copy codebook</button>
			</div>
		</div>
	`,
	props: ["text_list", "work_list", "codebook"],
	data() {
		return {
			na_value: 99
		};
	},
	methods: {
		copy_result(use_na_value) {
			const get_dic_code = a => this.codebook.find(b => b.words.includes(a))?.code ?? (use_na_value ? this.na_value : "");

			const export_string = this.text_list
				.map(a => [a.r, get_dic_code(a.k)].join("\t"))
				.join("\n");

			navigator.clipboard.writeText(export_string);
		},
		copy_codebook() {
			const export_string = this.codebook
				.map(item => [
					item.code,
					item.display_name,
					JSON.stringify(item.words)
				].join("\t"))
				.join("\n");

			navigator.clipboard.writeText(export_string);
		}
	}
};
