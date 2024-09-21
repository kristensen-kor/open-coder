// component_data_reader.js
import { translit_map } from "./translit_map.js";

const normalize = xs => xs.toLowerCase().replace(/[^\p{L}\p{N}\-()&]/gu, " ").replace(/\s+/g, " ").trim();
const transliterate = string => string.split("").map(a => translit_map.get(a) ?? a).join("");

export const component_data_reader = {
	template: `
		<div class="data-reader">
			<div class="textarea-container">
				<textarea v-model="data_input" rows="10" cols="50" :class="{ red_error: data_is_error }" :placeholder="data_placeholder"></textarea>
				<textarea v-model="codebook_input" rows="10" cols="50" :class="{ red_error: codebook_is_error }" :placeholder="codebook_placeholder"></textarea>
			</div>
			<button @click="read_data">Read data</button>
		</div>
	`,
	data() {
		return {
			data_placeholder: "Paste your data here...",
			codebook_placeholder: "Paste your codebook here...",
			data_is_error: false,
			codebook_is_error: false,
			data_input: "",
			codebook_input: ""
		};
	},
	methods: {
		read_data() {
			// Reset error states
			this.data_is_error = false;
			this.codebook_is_error = false;
			this.data_placeholder = "Paste your data here...";
			this.codebook_placeholder = "Paste your codebook here...";

			// Check if data_input is empty
			if (!this.data_input.trim()) {
				this.data_is_error = true;
				this.data_input = ""; // Clear the input field
				this.data_placeholder = "Error: Data input is empty or only contains whitespace.";
				return;
			}

			// Parse text_list
			const text_list = this.data_input
				.trim()
				.split("\n")
				.map((row, index) => ({
					r: row,
					k: normalize(row),
					row_number: index + 1 // Store the row number for error reporting
				}));

			// Calculate counts
			const counts = Object.fromEntries([...new Set(text_list.map(item => item.k))]
				.map(key => [key, 0]));

			text_list.forEach(item => counts[item.k]++);

			// Create work_list
			const work_list = Object.entries(counts)
				.map(([key, value]) => ({
					string: key,
					count: value,
					translit: transliterate(key),
					difference: ""
				}))
				.toSorted((a, b) => b.count - a.count);

			// Parse codebook
			let codebook = [];
			if (this.codebook_input.trim()) {
				try {
					codebook = this.codebook_input
						.trim()
						.split("\n")
						.filter(line => line.length > 0)
						.map((line, index) => {
							const columns = line.split("\t");

							// Check if columns exist (at least two columns are required)
							if (columns.length < 2) {
								throw new Error(`Row ${index + 1}: Codebook rows must have at least two tab-separated columns.`);
							}

							// Normalize display_name and check if it becomes empty
							const normalized_display_name = normalize(columns[1]);
							if (!normalized_display_name) {
								throw new Error(`Row ${index + 1}: Normalization resulted in an empty display name.`);
							}

							// Parse JSON from the third column if present
							let words = [];
							if (columns[2]) {
								try {
									words = JSON.parse(columns[2]);
									if (!Array.isArray(words)) {
										throw new Error(`Row ${index + 1}: Third column is not a valid JSON array.`);
									}
								} catch {
									throw new Error(`Row ${index + 1}: Invalid JSON format in the third column.`);
								}
							}

							// Ensure that code is a valid number
							const code = Number(columns[0]);
							if (isNaN(code)) {
								throw new Error(`Row ${index + 1}: Invalid number in the first column.`);
							}

							return {
								display_name: columns[1],
								string: normalized_display_name,
								gid: index,
								words: words,
								count: 0,
								code: code
							};
						});
				} catch (error) {
					this.codebook_is_error = true;
					this.codebook_input = "";
					this.codebook_placeholder = `Error: ${error.message}`;
					return;
				}
			}

			// Emit the parsed data if no errors were encountered
			this.$emit("read-data", {
				text_list: text_list,
				work_list: work_list,
				codebook: codebook
			});
		}
	},
	mounted() {
		// For testing purposes, may be uncommented to populate with test data
		// this.data_input = raw_data;
		// this.codebook_input = raw_codebook;
		// this.read_data();
	}
};
