import { describe, expect, test } from 'bun:test'
import { endpoints } from '../lib/openfga/endpoints.ts'

describe('endpoints', () => {
  test('listStores returns /stores', () => {
    expect(endpoints.listStores()).toBe('/stores')
  })

  test('createStore returns /stores', () => {
    expect(endpoints.createStore()).toBe('/stores')
  })

  test('getStore returns /stores/{storeId}', () => {
    expect(endpoints.getStore('store-123')).toBe('/stores/store-123')
  })

  test('deleteStore returns /stores/{storeId}', () => {
    expect(endpoints.deleteStore('store-123')).toBe('/stores/store-123')
  })

  test('listAuthorizationModels returns correct path', () => {
    expect(endpoints.listAuthorizationModels('store-123')).toBe(
      '/stores/store-123/authorization-models'
    )
  })

  test('getAuthorizationModel returns correct path', () => {
    expect(endpoints.getAuthorizationModel('store-123', 'model-456')).toBe(
      '/stores/store-123/authorization-models/model-456'
    )
  })

  test('writeAuthorizationModel returns correct path', () => {
    expect(endpoints.writeAuthorizationModel('store-123')).toBe(
      '/stores/store-123/authorization-models'
    )
  })

  test('read returns correct path', () => {
    expect(endpoints.read('store-123')).toBe('/stores/store-123/read')
  })

  test('write returns correct path', () => {
    expect(endpoints.write('store-123')).toBe('/stores/store-123/write')
  })

  test('check returns correct path', () => {
    expect(endpoints.check('store-123')).toBe('/stores/store-123/check')
  })

  test('expand returns correct path', () => {
    expect(endpoints.expand('store-123')).toBe('/stores/store-123/expand')
  })

  test('listObjects returns correct path', () => {
    expect(endpoints.listObjects('store-123')).toBe('/stores/store-123/list-objects')
  })

  test('listUsers returns correct path', () => {
    expect(endpoints.listUsers('store-123')).toBe('/stores/store-123/list-users')
  })
})
