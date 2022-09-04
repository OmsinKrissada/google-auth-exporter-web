//LICENSE: MIT to Kahiro Koo
// https://github.com/KahiroKoo/edBase32
// Modified by Kristian Rekstad: removed decode; use buffer as input.

//encode base32 in RFC 3548
class Base32 {
	readonly charJson = [
		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'2', '3', '4', '5', '6', '7'
	];

	encode(input: Uint8Array) {
		var aAscii2 = [];
		for (const ascii of input) {
			var ascii2 = ascii.toString(2);
			var gap = 8 - ascii2.length;
			var zeros = '';
			for (var i = 0; i < gap; i++) {
				zeros = '0' + zeros;
			}
			ascii2 = zeros + ascii2;

			aAscii2.push(ascii2);
		}

		var source = aAscii2.join('');

		var eArr = [];
		for (var i = 0; i < source.length; i += 5) {
			var s5 = source.substring(i, i + 5);
			if (s5.length < 5) {
				var gap = 5 - s5.length;
				var zeros = '';
				for (var gi = 0; gi < gap; gi++) {
					zeros += '0';
				}
				s5 += zeros;
			}

			var eInt = parseInt(s5, 2);

			eArr.push(this.charJson[eInt]);
		}
		if (eArr.length % 8 != 0) {
			var gap = 8 - (eArr.length % 8);
			for (var i = 0; i < gap; i++) {
				eArr.push('=');
			}
		}
		var eStr = eArr.join('');

		return eStr;
	}
}

export const base32 = new Base32();