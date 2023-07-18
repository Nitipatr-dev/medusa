import {
  InventoryItemDTO,
  MedusaContainer,
  ProductTypes,
} from "@medusajs/types"
import { EntityManager } from "typeorm"
import { ProductVariantInventoryService } from "../../services"

export async function attachInventoryItems({
  container,
  manager,
  data,
}: {
  container: MedusaContainer
  manager: EntityManager
  data: {
    variant: ProductTypes.ProductVariantDTO
    inventoryItem: InventoryItemDTO
  }[]
}) {
  const productVariantInventoryService: ProductVariantInventoryService =
    container.resolve("productVariantInventoryService").withTransaction(manager)

  return await Promise.all(
    data
      .filter((d) => d)
      .map(async ({ variant, inventoryItem }) => {
        return await productVariantInventoryService.attachInventoryItem(
          variant.id,
          inventoryItem.id
        )
      })
  )
}
