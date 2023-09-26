import {
  CreatePriceRuleDTO,
  CreatePriceSetDTO,
  IPricingModuleService,
} from "@medusajs/types"
import { SqlEntityManager } from "@mikro-orm/postgresql"
import { PriceSet } from "@models"

import { initialize } from "../../../../src"
import {
  createCurrencies,
  defaultCurrencyData,
} from "../../../__fixtures__/currency"
import {
  createMoneyAmounts,
  defaultMoneyAmountsData,
} from "../../../__fixtures__/money-amount"
import {
  createPriceRules,
  defaultPriceRuleData,
} from "../../../__fixtures__/price-rule"
import {
  createPriceSets,
  defaultPriceSetsData,
} from "../../../__fixtures__/price-set"
import {
  createPriceSetMoneyAmounts,
  defaultPriceSetMoneyAmountsData,
} from "../../../__fixtures__/price-set-money-amount"

import {
  createRuleTypes,
  defaultRuleTypesData,
} from "../../../__fixtures__/rule-type"
import { DB_URL, MikroOrmWrapper } from "../../../utils"

jest.setTimeout(30000)

async function seedData({
  moneyAmountsData = defaultMoneyAmountsData,
  priceSetsData = defaultPriceSetsData,
  currencyData = defaultCurrencyData,
  priceRuleData = defaultPriceRuleData,
  priceSetMoneyAmountsData = defaultPriceSetMoneyAmountsData,
  ruleTypesData = defaultRuleTypesData,
} = {}) {
  const testManager = MikroOrmWrapper.forkManager()

  await createCurrencies(testManager, currencyData)
  await createMoneyAmounts(testManager, moneyAmountsData)
  await createPriceSets(testManager, priceSetsData)
  await createPriceSetMoneyAmounts(testManager, priceSetMoneyAmountsData)
  await createRuleTypes(testManager, ruleTypesData)
  await createPriceRules(testManager, priceRuleData)
}

describe("PricingModule Service - Calculate Price", () => {
  let service: IPricingModuleService
  let testManager: SqlEntityManager
  let repositoryManager: SqlEntityManager
  let data!: PriceSet[]

  beforeEach(async () => {
    await MikroOrmWrapper.setupDatabase()
    repositoryManager = MikroOrmWrapper.forkManager()
    testManager = MikroOrmWrapper.forkManager()
    service = await initialize({
      database: {
        clientUrl: DB_URL,
        schema: process.env.MEDUSA_PRICING_DB_SCHEMA,
      },
    })
  })

  afterEach(async () => {
    await MikroOrmWrapper.clearDatabase()
  })

  describe("calculatePrices", () => {
    beforeEach(async () => {
      const currencyData = [
        {
          symbol: "zł",
          name: "Polish Zloty",
          symbol_native: "zł",
          code: "PLN",
        },
        {
          symbol: "€",
          name: "Euro",
          symbol_native: "€",
          code: "EUR",
        },
      ]

      const moneyAmountsData = [
        {
          id: "money-amount-currency_code-EUR",
          currency_code: "EUR",
          amount: 500,
          min_quantity: 1,
          max_quantity: 10,
        },
        {
          id: "money-amount-currency_code-PLN",
          currency_code: "PLN",
          amount: 400,
          min_quantity: 1,
          max_quantity: 5,
        },
        {
          id: "money-amount-region_id-PLN",
          currency_code: "PLN",
          amount: 300,
          min_quantity: 1,
          max_quantity: 4,
        },
        {
          id: "money-amount-region_id-PL-EUR",
          currency_code: "EUR",
          amount: 200,
          min_quantity: 1,
          max_quantity: 3,
        },
        {
          id: "money-amount-region_id-PL-EUR-customer-group",
          currency_code: "EUR",
          amount: 100,
          min_quantity: 1,
          max_quantity: 3,
        },
      ]

      const priceSetsData = [
        {
          id: "price-set-EUR",
        },
        {
          id: "price-set-PLN",
        },
      ] as unknown as CreatePriceSetDTO[]

      const priceSetMoneyAmountsData = [
        {
          id: "psma-currency_code-EUR",
          title: "psma EUR - currency_code",
          price_set: "price-set-EUR",
          money_amount: "money-amount-currency_code-EUR",
          number_rules: 1,
        },
        {
          id: "psma-currency_code-PLN",
          title: "psma PLN - currency_code",
          price_set: "price-set-PLN",
          money_amount: "money-amount-currency_code-PLN",
          number_rules: 1,
        },
        {
          id: "psma-region_id-PLN",
          title: "psma PLN - region_id",
          price_set: "price-set-PLN",
          money_amount: "money-amount-region_id-PLN",
          number_rules: 1,
        },
        {
          id: "psma-region_id_currency_code-PL-EUR",
          title: "psma PLN - region_id PL with EUR currency",
          price_set: "price-set-PLN",
          money_amount: "money-amount-region_id-PL-EUR",
          number_rules: 2,
        },
        {
          id: "psma-region_id_currency_code-PL-EUR-customer-group",
          title: "psma PLN - region_id PL with EUR currency for customer group",
          price_set: "price-set-PLN",
          money_amount: "money-amount-region_id-PL-EUR-customer-group",
          number_rules: 3,
        },
      ]

      const ruleTypesData = [
        {
          id: "rule-type-currency_code",
          name: "rule type currency code",
          rule_attribute: "currency_code",
          default_priority: 2,
        },
        {
          id: "rule-type-region_id",
          name: "rule type region id",
          rule_attribute: "region_id",
          default_priority: 1,
        },
        {
          id: "rule-type-customer_group_id",
          name: "rule type customer group id",
          rule_attribute: "customer_group_id",
          default_priority: 3,
        },
      ]

      const priceRuleData = [
        {
          id: "price-rule-currency_code-EUR",
          price_set_id: "price-set-EUR",
          rule_type_id: "rule-type-currency_code",
          value: "EUR",
          price_list_id: "test",
          price_set_money_amount_id: "psma-currency_code-EUR",
        },
        {
          id: "price-rule-currency_code-PLN",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-currency_code",
          value: "PLN",
          price_list_id: "test",
          price_set_money_amount_id: "psma-currency_code-PLN",
        },
        {
          id: "price-rule-region_id-PLN",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-region_id",
          value: "PL",
          price_list_id: "test",
          price_set_money_amount_id: "psma-region_id-PLN",
        },
        {
          id: "price-rule-region_id-currency_code-PL",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-region_id",
          value: "PL",
          price_list_id: "test",
          price_set_money_amount_id: "psma-region_id_currency_code-PL-EUR",
        },
        {
          id: "price-rule-region_id-currency_code-PLN",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-currency_code",
          value: "EUR",
          price_list_id: "test",
          price_set_money_amount_id: "psma-region_id_currency_code-PL-EUR",
        },
        {
          id: "price-rule-region_id-currency_customer_group_code-PL",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-region_id",
          value: "PL",
          price_list_id: "test",
          price_set_money_amount_id:
            "psma-region_id_currency_code-PL-EUR-customer-group",
        },
        {
          id: "price-rule-region_id-currency_customer_group_code-PLN",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-currency_code",
          value: "EUR",
          price_list_id: "test",
          price_set_money_amount_id:
            "psma-region_id_currency_code-PL-EUR-customer-group",
        },
        {
          id: "price-rule-region_id-currency_customer_group_code-test_customer_group",
          price_set_id: "price-set-PLN",
          rule_type_id: "rule-type-customer_group_id",
          value: "test-customer-group",
          price_list_id: "test",
          price_set_money_amount_id:
            "psma-region_id_currency_code-PL-EUR-customer-group",
        },
      ] as unknown as CreatePriceRuleDTO[]

      await seedData({
        currencyData,
        moneyAmountsData,
        priceSetsData,
        priceSetMoneyAmountsData,
        priceRuleData,
        ruleTypesData,
      })
    })

    it("should return null values when no context is set", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {}
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })

    it("should return filled prices when 1 context is present and price is setup for EUR", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { currency_code: "EUR" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })

    it("should return filled prices when 1 context is present and price is setup for PLN region_id", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { region_id: "PL" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        {
          id: "price-set-PLN",
          amount: "300",
          currency_code: "PLN",
          min_quantity: "1",
          max_quantity: "4",
        },
      ])
    })

    it("should return filled prices when 1 context is present and price is setup for PLN currency_code", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { currency_code: "PLN" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        {
          id: "price-set-PLN",
          amount: "400",
          currency_code: "PLN",
          min_quantity: "1",
          max_quantity: "5",
        },
      ])
    })

    it("should return null prices when 1 context is present and price is NOT setup", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { does_not_exist: "EUR" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })

    it("should return filled prices when 2 contexts are present and price is setup", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { currency_code: "EUR", region_id: "PL" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        {
          id: "price-set-PLN",
          amount: "200",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "3",
        },
      ])
    })

    it("should return filled prices when 3 contexts are present and price is partially setup for 2", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: {
            currency_code: "EUR",
            region_id: "PL",
            customer_group_id: "test",
          },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        {
          id: "price-set-PLN",
          amount: "200",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "3",
        },
      ])
    })

    it("should return filled prices when 3 contexts are present and price is setup for 3", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: {
            currency_code: "EUR",
            region_id: "PL",
            customer_group_id: "test-customer-group",
          },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        // Currency Code + Region value + customer group id
        {
          id: "price-set-PLN",
          amount: "100",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "3",
        },
      ])
    })

    it("should return filled prices when 3 contexts are present and price is setup for 3, but value is incorrect for 1. It falls back to 2 rule context", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: {
            currency_code: "EUR",
            region_id: "PL",
            customer_group_id: "does-not-exist",
          },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        // Currency Code + Region value
        {
          id: "price-set-PLN",
          amount: "200",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "3",
        },
      ])
    })

    it("should return filled prices when 3 contexts are present and price is setup for 3, but value is incorrect for 2. It falls back to 1 rule context when 1 rule is not setup", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: {
            currency_code: "does-not-exist",
            region_id: "PL",
            customer_group_id: "does-not-exist",
          },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        // PLN price set is not setup for EUR currency_code so it will default to a null set
        {
          id: "price-set-PLN",
          amount: "300",
          currency_code: "PLN",
          min_quantity: "1",
          max_quantity: "4",
        },
      ])
    })

    it("should return filled prices when 3 contexts are present and price is setup for 3, but value is incorrect for 2. It falls back to 1 rule context when 1 rule is setup", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: {
            currency_code: "EUR",
            region_id: "does-not-exist",
            customer_group_id: "does-not-exist",
          },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        // PLN price set is not setup for EUR currency_code so it will default to a null set
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })

    it("should return null prices when 2 context is present and prices are NOT setup", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { does_not_exist: "EUR", does_not_exist_2: "Berlin" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })

    it("should return filled prices when 2 context is present and prices are setup, but only for one of the contexts", async () => {
      const priceSetsResult = await service.calculatePrices(
        { id: ["price-set-EUR", "price-set-PLN"] },
        {
          context: { currency_code: "EUR", does_not_exist: "Berlin" },
        }
      )

      expect(priceSetsResult).toEqual([
        {
          id: "price-set-EUR",
          amount: "500",
          currency_code: "EUR",
          min_quantity: "1",
          max_quantity: "10",
        },
        {
          id: "price-set-PLN",
          amount: null,
          currency_code: null,
          min_quantity: null,
          max_quantity: null,
        },
      ])
    })
    // describe("single pricing context", () => {
    //   beforeEach(async () => await seedData())

    //   it("retrieves the calculated prices when no context is set", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {}
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           currency_code: "USD",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: "500",
    //         currency_code: "USD",
    //         min_quantity: "1",
    //         max_quantity: "10",
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices only when id exists in the database", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-doesnotexist", "price-set-1"] },
    //       {
    //         context: { currency_code: "USD" },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: "500",
    //         currency_code: "USD",
    //         min_quantity: "1",
    //         max_quantity: "10",
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set, but not present in the db", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           currency_code: "TEST",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set but rule attribute doesnt exist the data layer", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           city: "Berlin",
    //         } as any,
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set with a totally random pricing attribute", async () => {
    //     await createCurrencies(testManager, [
    //       {
    //         name: "dollas",
    //         code: "DOLLA",
    //         symbol: "$",
    //         symbol_native: "$",
    //       },
    //     ])

    //     await createPriceSets(testManager, [
    //       {
    //         id: "price-set-city",
    //         money_amounts: [],
    //       } as any,
    //     ])

    //     await createMoneyAmounts(testManager, [
    //       {
    //         id: "money-amount-city",
    //         currency_code: "DOLLA",
    //         amount: 666,
    //       },
    //     ])

    //     await createPriceSetMoneyAmounts(testManager, [
    //       {
    //         id: "price-set-money-amount-city",
    //         title: "psma city",
    //         price_set: "price-set-city",
    //         money_amount: "money-amount-city",
    //       },
    //     ])

    //     await createRuleTypes(testManager, [
    //       {
    //         id: "rule-type-city",
    //         name: "rule type city",
    //         rule_attribute: "city",
    //       },
    //     ])

    //     await createPriceRules(testManager, [
    //       {
    //         id: "price-rule-city",
    //         price_set_id: "price-set-city",
    //         rule_type_id: "rule-type-city",
    //         price_set_money_amount_id: "price-set-money-amount-city",
    //         value: "Berlin",
    //         price_list_id: "test",
    //       },
    //     ])

    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-city"] },
    //       {
    //         context: {
    //           city: "Berlin",
    //         } as any,
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-city",
    //         amount: "666",
    //         currency_code: "DOLLA",
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })
    // })

    // describe("multiple pricing context", () => {
    //   beforeEach(async () => {
    //     const moneyAmountsData = [
    //       ...defaultMoneyAmountsData,
    //       {
    //         id: "money-amount-USD-region",
    //         currency_code: "USD",
    //         amount: 222,
    //         min_quantity: 1,
    //         max_quantity: 10,
    //       },
    //     ]

    //     const priceSetMoneyAmountsData = [
    //       ...defaultPriceSetMoneyAmountsData,
    //       {
    //         id: "price-set-money-amount-USD-region",
    //         title: "price set money amount USD for US region",
    //         price_set: "price-set-1",
    //         money_amount: "money-amount-USD-region",
    //         number_rules: 1,
    //       },
    //     ]

    //     const priceRuleData = [
    //       ...defaultPriceRuleData,
    //       {
    //         id: "price-rule-3",
    //         price_set_id: "price-set-1",
    //         rule_type_id: "rule-type-2", // region_id
    //         value: "US",
    //         price_list_id: "test",
    //         price_set_money_amount_id: "price-set-money-amount-USD-region",
    //       },
    //       {
    //         id: "price-rule-4",
    //         price_set_id: "price-set-1",
    //         rule_type_id: "rule-type-1",
    //         value: "USD",
    //         price_list_id: "test",
    //         price_set_money_amount_id: "price-set-money-amount-USD-region",
    //       },
    //     ]

    //     await seedData({
    //       moneyAmountsData,
    //       priceRuleData,
    //       priceSetMoneyAmountsData,
    //     })
    //   })

    //   it("retrieves the calculated prices when multiple context is set", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           currency_code: "USD",
    //           region_id: "US",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: "222",
    //         currency_code: "USD",
    //         min_quantity: "1",
    //         max_quantity: "10",
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the null calculated prices when multiple context is set that does not exist", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1"] },
    //       {
    //         context: {
    //           currency_code: "USD",
    //           region_id: "US",
    //           doesnotexist: "doesnotexist",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("returns null conditions for a singular rule type that is part of a compound rule", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1"] },
    //       {
    //         context: {
    //           // A rule with region_id alone is not seeded
    //           region_id: "US",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices only when id exists in the database", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-doesnotexist", "price-set-1"] },
    //       {
    //         context: { currency_code: "USD", region_id: "US" },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: "222",
    //         currency_code: "USD",
    //         min_quantity: "1",
    //         max_quantity: "10",
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set, but price rule value is not present in the db", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           currency_code: "TEST",
    //           region_id: "DE",
    //         },
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })

    //   it("retrieves the calculated prices when a context is set but rule attribute doesnt exist the data layer", async () => {
    //     const priceSetsResult = await service.calculatePrices(
    //       { id: ["price-set-1", "price-set-2"] },
    //       {
    //         context: {
    //           city: "Berlin",
    //           region_id: "DE",
    //         } as any,
    //       }
    //     )

    //     expect(priceSetsResult).toEqual([
    //       {
    //         id: "price-set-1",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //       {
    //         id: "price-set-2",
    //         amount: null,
    //         currency_code: null,
    //         min_quantity: null,
    //         max_quantity: null,
    //       },
    //     ])
    //   })
    // })
  })
})
