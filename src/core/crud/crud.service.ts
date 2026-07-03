export abstract class CrudService<T> {
  abstract findAll(empresaId: string): Promise<T[]>;
  abstract findById(id: string, empresaId: string): Promise<T | null>;
  abstract create(dto: any, empresaId: string): Promise<T>;
  abstract update(id: string, dto: any, empresaId: string): Promise<T>;
  abstract remove(id: string, empresaId: string): Promise<void>;
}
