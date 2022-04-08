import Head from 'next/head';
import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import * as Yup from 'yup';
import SelectUser from '../../components/selectUser/SelectUser';
import { Emoji, GenericObject, User } from '@models';
import { useFormik } from 'formik';
import { Button } from '@dummy-system';
import EmojiComponent from '../../components/emoji/EmojiComponent';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import axios from 'axios';
import { useGetEmojis, useGetUsers } from '@services';
var gravatar = require('gravatar');

export default function Vote() {
  const router = useRouter();
  const { paramUser } = router.query;

  const { emojis: emojisList } = useGetEmojis();
  const { users: userList } = useGetUsers(emojisList);

  const pageTitle = `Votação - ${process.env.NEXT_PUBLIC_TITLE}`;

  const passwordfield = {
    password: Yup.string()
      .typeError('Palavra-chave é obrigatória.')
      .required('Palavra-chave é obrigatória.'),
  };

  /** Loading state antes de uma mudança de página. */
  const [loading, setLoading] = useState<boolean>(false);

  /** Usuário selecionado. */
  const [user, setUser] = useState<string | number>(null);

  /** Algum usuário está selecionado? */
  const [isSelected, setIsSelected] = useState<boolean>(false);

  /** Lista de usuários SEM o usuário selecionado. */
  const [filteredUserList, setFilteredUserList] = useState<User[]>([]);

  /** Validação de formulário. */
  const [validationSchema, setValidationSchema] = useState<any>(
    Yup.object().shape({
      ...passwordfield,
    }),
  );

  /**
   * Formulário de votação.
   */
  const form = useFormik({
    initialValues: null,
    onSubmit: async valuesFromForm => {
      setLoading(true);

      await axios
        .post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/vote`, {
          user,
          valuesFromForm,
        })
        .then(res => {
          const redirectUrl = res?.data?.url ?? '/';
          router.push(redirectUrl);
        })
        .catch(err => {
          const { error } = err?.response?.data;
          if (error) {
            Object.keys(error)
              .filter(field => form.values[field] != undefined)
              .forEach(field => (form.errors[field] = error[field]));
          }
        })
        .finally(() => setLoading(false));
    },
    validationSchema: validationSchema,
    validateOnChange: true,
  });

  /**
   * Reage à mudança gatilhada pela escolha de usuário.
   *
   * @param event Evento disparado pela modificação do select.
   */
  const handleUserSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const selectedUser = event.target.value;
    setUser(selectedUser);

    // altera a rota com shallow routing
    router.push(`/vote`, `/vote/${selectedUser}`, { shallow: true });
  };

  /**
   * Cria objeto utilizado para contabilizar votos do queridômetro ao
   * associar os emojis pré-definidos aos usuários cadastrados no sistema.
   *
   * @param userList
   * @param emojiList
   * @returns Lista de usuários com 0 votos em todas reações.
   */
  const buildNewVoteObject = (userList: User[], emojiList: Emoji[]): User[] => {
    if (emojiList) {
      return userList.map(user => {
        user.emojiList = JSON.parse(JSON.stringify(emojiList));
        return user;
      });
    }
    return [];
  };

  /**
   * Reconstroi o formulário cada vez que um usuário diferente é selecionado.
   *
   * @param filteredUserList Lista filtrada de usuários.
   * @param oldValues Votos realizados antes da mudança de user.
   */
  const buildForm = useCallback(
    (filteredUserList: User[], oldValues: GenericObject[]) => {
      const _initialValues = { password: form?.values?.password ?? null };
      filteredUserList.forEach(user => {
        _initialValues[user.name] = oldValues[user.name] ?? null;
      });

      form.setValues(_initialValues);
    },
    [filteredUserList],
  );

  /**
   * Reconstroi o esquema de validação do formulário de votos.
   *
   * @param filteredUserList Lista filtrada de usuários.
   */
  const buildValidationSchema = useCallback(
    (filteredUserList: User[]) => {
      const _validationSchema = {
        ...passwordfield,
      };

      filteredUserList.forEach(user => {
        _validationSchema[user.name] = Yup.string().required(
          'Campo obrigatório',
        );
      });

      setValidationSchema(Yup.object().shape(_validationSchema));
    },
    [filteredUserList],
  );

  /**
   * [Effect]: Alterações no parâmetro User.
   */
  useEffect(() => {
    if (!paramUser || !userList) return;

    // temos um parâmetro
    const _selectThisUser = userList.find(user => user.name === paramUser[0]);
    if (_selectThisUser) {
      setUser(_selectThisUser?.name);
    } else {
      // usuário não encontrado: limpa a rota com shallow routing
      router.push('/vote', '/vote', { shallow: true });
    }
  }, [paramUser, userList]);

  /**
   * [Effect]: Alterou-se o usuário que está votando atualmente.
   */
  useEffect(() => {
    if (user !== null) {
      const _users = userList.filter(u => u.name !== user);
      const _oldValues = form.values;
      setFilteredUserList(buildNewVoteObject(_users, emojisList));
      setIsSelected(true);
      buildForm(_users, _oldValues ?? []);
      buildValidationSchema(_users);
    }
  }, [user]);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto p-8">
        <h1 className="text-5xl font-sans text-center font-semibold">
          {pageTitle}
        </h1>
      </div>

      <div className="container mx-auto px-6 md:px-0">
        <div className="row justify-center">
          {SelectUser(user, userList, handleUserSelect)}

          {isSelected && (
            <form
              onSubmit={form.handleSubmit}
              className={clsx(
                `py-4 container w-full md:max-w-lg md:mx-auto flex flex-col justify-center grid grid-flow-row`,
              )}
            >
              {filteredUserList.map(user => (
                <div
                  className={clsx(
                    `row justify-center grid grid-flow-col text-2xl items-center py-2 gap-1 border-l-4`,
                    {
                      'border-red-600':
                        form?.errors[user.name] && form?.touched[user.name],
                      'border-transparent':
                        !form?.errors[user.name] || !form?.touched[user.name],
                    },
                  )}
                  key={user.name}
                >
                  {/* Foto do participante */}
                  <div className="flex justify-center">
                    <div
                      role="image"
                      aria-label={`Foto de ${user.name}`}
                      className="w-50 p-6 shadow rounded-full"
                      style={{
                        background: `url("${gravatar.url(user?.email)}") no-repeat center center`,
                        backgroundSize: 'cover',
                      }}
                    />
                  </div>

                  {/* Lista de emojis/reações */}
                  {user.emojiList.map(emoji => (
                    <EmojiComponent
                      pointer
                      withShadow
                      key={user?.name + emoji?.label}
                      emoji={emoji}
                      user={user}
                      form={form}
                    />
                  ))}
                </div>
              ))}

              <div className="flex justify-center w-full pt-4 md:max-w-xs md:mx-auto grid grid-cols-8 gap-1">
                <input
                  placeholder="Palavra-chave"
                  name="password"
                  type="password"
                  autoComplete="none"
                  onChange={form.handleChange}
                  className={clsx(`col-span-5 rounded-md`, {
                    'border-red-600':
                      form.errors?.password && form.touched?.password,
                  })}
                />
                <Button
                  primary
                  type="submit"
                  className="col-span-3"
                  loading={loading}
                >
                  Enviar
                </Button>
                {form?.errors?.password && form?.touched?.password && (
                  <p className="col-span-8 text-red-600 text-xs">
                    {form?.errors?.password}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
