import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { CustomersService } from "./customers.service"

@Controller("orgs/:orgId/customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  async getCustomers(
    @Param("orgId") orgId: string,
    @Query("platform") platform?: string,
    @Query("search") search?: string
  ) {
    return this.customersService.getCustomers(orgId, { platform, search })
  }

  @Get("/:customerId")
  async getCustomer(
    @Param("orgId") orgId: string,
    @Param("customerId") customerId: string
  ) {
    return this.customersService.getCustomer(orgId, customerId)
  }

  @Get("/:customerId/tickets")
  async getCustomerTickets(
    @Param("orgId") orgId: string,
    @Param("customerId") customerId: string
  ) {
    return this.customersService.getCustomerTickets(orgId, customerId)
  }

  @Get("/stats/platforms")
  async getPlatformStats(@Param("orgId") orgId: string) {
    return this.customersService.getCustomersByPlatform(orgId)
  }

  @Get("/overview/dashboard")
  async getCustomerOverview(@Param("orgId") orgId: string) {
    return this.customersService.getCustomersWithPlatformStats(orgId)
  }
}