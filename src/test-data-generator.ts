/**
 * Test Data Generator
 *
 * This module generates realistic test data for mobile app testing:
 * - Personal information (names, emails, phones)
 * - Addresses (streets, cities, countries)
 * - Financial data (credit cards, IBANs)
 * - Dates and times
 * - Random text and numbers
 *
 * Purpose: Provide consistent, realistic test data for automated tests
 */

// Locale support
export type Locale = "en-US" | "ru-RU" | "uk-UA" | "de-DE" | "fr-FR";

// Generated person data
export interface PersonData {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  age: number;
  gender: "male" | "female";
  username: string;
}

// Generated address data
export interface AddressData {
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  fullAddress: string;
}

// Generated credit card data
export interface CreditCardData {
  number: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  type: "visa" | "mastercard" | "amex";
}

export class TestDataGenerator {
	private locale: Locale;

	constructor(locale: Locale = "en-US") {
		this.locale = locale;
	}

	// ==================== Names ====================

	private firstNamesEn = [
		"James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
		"Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica",
		"Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven",
		"Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley"
	];

	private lastNamesEn = [
		"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
		"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
		"Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"
	];

	private firstNamesRu = [
		"Александр", "Дмитрий", "Сергей", "Андрей", "Алексей", "Михаил", "Иван", "Максим",
		"Анна", "Мария", "Елена", "Ольга", "Наталья", "Татьяна", "Ирина", "Екатерина",
		"Владимир", "Николай", "Павел", "Евгений", "Артем", "Роман", "Виктор", "Юрий"
	];

	private lastNamesRu = [
		"Иванов", "Смирнов", "Кузнецов", "Попов", "Васильев", "Петров", "Соколов", "Михайлов",
		"Новиков", "Федоров", "Морозов", "Волков", "Алексеев", "Лебедев", "Семенов", "Егоров"
	];

	/**
   * Generate random first name
   */
	generateFirstName(gender?: "male" | "female"): string {
		const names = this.locale === "ru-RU" ? this.firstNamesRu : this.firstNamesEn;
		return this.randomElement(names);
	}

	/**
   * Generate random last name
   */
	generateLastName(): string {
		const names = this.locale === "ru-RU" ? this.lastNamesRu : this.lastNamesEn;
		return this.randomElement(names);
	}

	/**
   * Generate full person data
   */
	generatePerson(): PersonData {
		const gender = Math.random() > 0.5 ? "male" : "female";
		const firstName = this.generateFirstName(gender);
		const lastName = this.generateLastName();
		const fullName = `${firstName} ${lastName}`;

		// Generate age between 18-65
		const age = Math.floor(Math.random() * 47) + 18;
		const currentYear = new Date().getFullYear();
		const birthYear = currentYear - age;
		const birthMonth = Math.floor(Math.random() * 12) + 1;
		const birthDay = Math.floor(Math.random() * 28) + 1;

		return {
			firstName,
			lastName,
			fullName,
			email: this.generateEmail(firstName, lastName),
			phone: this.generatePhone(),
			dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
			age,
			gender,
			username: this.generateUsername(firstName, lastName)
		};
	}

	// ==================== Email ====================

	private emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "mail.com", "example.com"];

	/**
   * Generate random email
   */
	generateEmail(firstName?: string, lastName?: string): string {
		if (!firstName) {
			firstName = this.generateFirstName();
		}
		if (!lastName) {
			lastName = this.generateLastName();
		}

		const domain = this.randomElement(this.emailDomains);
		const separator = this.randomElement([".", "_", ""]);
		const random = Math.floor(Math.random() * 999);

		return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${random}@${domain}`;
	}

	// ==================== Phone ====================

	/**
   * Generate phone number based on locale
   */
	generatePhone(): string {
		switch (this.locale) {
			case "en-US":
				// Format: +1 (555) 123-4567
				return `+1 (${this.randomDigits(3)}) ${this.randomDigits(3)}-${this.randomDigits(4)}`;

			case "ru-RU":
				// Format: +7 (912) 345-67-89
				return `+7 (${this.randomDigits(3)}) ${this.randomDigits(3)}-${this.randomDigits(2)}-${this.randomDigits(2)}`;

			case "uk-UA":
				// Format: +380 (67) 123-45-67
				return `+380 (${this.randomDigits(2)}) ${this.randomDigits(3)}-${this.randomDigits(2)}-${this.randomDigits(2)}`;

			case "de-DE":
				// Format: +49 30 12345678
				return `+49 ${this.randomDigits(2)} ${this.randomDigits(8)}`;

			case "fr-FR":
				// Format: +33 1 23 45 67 89
				return `+33 ${this.randomDigits(1)} ${this.randomDigits(2)} ${this.randomDigits(2)} ${this.randomDigits(2)} ${this.randomDigits(2)}`;

			default:
				return `+1 (${this.randomDigits(3)}) ${this.randomDigits(3)}-${this.randomDigits(4)}`;
		}
	}

	// ==================== Username ====================

	/**
   * Generate username
   */
	generateUsername(firstName?: string, lastName?: string): string {
		if (!firstName) {
			firstName = this.generateFirstName();
		}
		if (!lastName) {
			lastName = this.generateLastName();
		}

		const variations = [
			`${firstName.toLowerCase()}${lastName.toLowerCase()}`,
			`${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
			`${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
			`${firstName.toLowerCase()}${Math.floor(Math.random() * 9999)}`,
			`${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}${Math.floor(Math.random() * 999)}`
		];

		return this.randomElement(variations);
	}

	// ==================== Address ====================

	private streetsEn = [
		"Main Street", "Oak Avenue", "Maple Drive", "Cedar Lane", "Park Road",
		"Washington Street", "Lake View Drive", "Elm Street", "Pine Avenue", "Hill Road"
	];

	private citiesEn = [
		"New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
		"Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"
	];

	private statesEn = [
		"CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"
	];

	/**
   * Generate address
   */
	generateAddress(): AddressData {
		const streetNumber = Math.floor(Math.random() * 9999) + 1;
		const street = `${streetNumber} ${this.randomElement(this.streetsEn)}`;
		const city = this.randomElement(this.citiesEn);
		const state = this.randomElement(this.statesEn);
		const zipCode = this.randomDigits(5);
		const country = this.locale === "en-US" ? "USA" : "Unknown";

		return {
			street,
			city,
			state,
			zipCode,
			country,
			fullAddress: `${street}, ${city}, ${state} ${zipCode}, ${country}`
		};
	}

	// ==================== Credit Card ====================

	/**
   * Generate credit card data (TEST DATA ONLY - NOT REAL)
   */
	generateCreditCard(type?: "visa" | "mastercard" | "amex"): CreditCardData {
		if (!type) {
			type = this.randomElement(["visa", "mastercard", "amex"]);
		}

		let number: string;
		switch (type) {
			case "visa":
				number = `4${this.randomDigits(15)}`;
				break;
			case "mastercard":
				number = `5${this.randomDigits(15)}`;
				break;
			case "amex":
				number = `3${this.randomDigits(14)}`;
				break;
		}

		const currentYear = new Date().getFullYear();
		const expiryYear = String(currentYear + Math.floor(Math.random() * 5) + 1).slice(-2);
		const expiryMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");

		const person = this.generatePerson();

		return {
			number,
			cvv: this.randomDigits(3),
			expiryMonth,
			expiryYear,
			cardholderName: person.fullName.toUpperCase(),
			type
		};
	}

	// ==================== Password ====================

	/**
   * Generate secure password
   */
	generatePassword(length: number = 12, includeSymbols: boolean = true): string {
		const lowercase = "abcdefghijklmnopqrstuvwxyz";
		const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const numbers = "0123456789";
		const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

		let chars = lowercase + uppercase + numbers;
		if (includeSymbols) {
			chars += symbols;
		}

		let password = "";

		// Ensure at least one of each type
		password += this.randomElement(lowercase.split(""));
		password += this.randomElement(uppercase.split(""));
		password += this.randomElement(numbers.split(""));
		if (includeSymbols) {
			password += this.randomElement(symbols.split(""));
		}

		// Fill remaining length
		for (let i = password.length; i < length; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		// Shuffle
		return password.split("").sort(() => Math.random() - 0.5).join("");
	}

	// ==================== Date ====================

	/**
   * Generate random date between two dates
   */
	generateDate(startDate?: Date, endDate?: Date): string {
		if (!startDate) {
			startDate = new Date(2020, 0, 1);
		}
		if (!endDate) {
			endDate = new Date();
		}

		const timestamp = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
		const date = new Date(timestamp);

		return date.toISOString().split("T")[0];
	}

	/**
   * Generate future date
   */
	generateFutureDate(daysAhead: number = 30): string {
		const date = new Date();
		date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1);
		return date.toISOString().split("T")[0];
	}

	/**
   * Generate past date
   */
	generatePastDate(daysBack: number = 30): string {
		const date = new Date();
		date.setDate(date.getDate() - Math.floor(Math.random() * daysBack) - 1);
		return date.toISOString().split("T")[0];
	}

	// ==================== Random Text ====================

	/**
   * Generate random text/lorem ipsum
   */
	generateText(sentences: number = 3): string {
		const words = [
			"lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
			"sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
			"magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud"
		];

		let text = "";
		for (let i = 0; i < sentences; i++) {
			const sentenceLength = Math.floor(Math.random() * 10) + 5;
			let sentence = "";

			for (let j = 0; j < sentenceLength; j++) {
				sentence += this.randomElement(words) + " ";
			}

			sentence = sentence.trim();
			sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + ". ";
			text += sentence;
		}

		return text.trim();
	}

	// ==================== Helpers ====================

	/**
   * Generate random digits as string
   */
	private randomDigits(length: number): string {
		let result = "";
		for (let i = 0; i < length; i++) {
			result += Math.floor(Math.random() * 10);
		}
		return result;
	}

	/**
   * Get random element from array
   */
	private randomElement<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)];
	}

	/**
   * Generate random number in range
   */
	generateNumber(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
   * Generate random boolean
   */
	generateBoolean(): boolean {
		return Math.random() > 0.5;
	}

	/**
   * Set locale
   */
	setLocale(locale: Locale): void {
		this.locale = locale;
	}
}
